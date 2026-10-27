import type { CaptureRepo, RepoResult } from "@/lib/capture";
import type { DiscRecord, MediaKind, RecordStatus } from "@disco/domain";
import { isSearchRow, type Search, type SearchRow } from "@/lib/inventory";
import { buildBatchSummaries, type BatchSummary } from "@/lib/batch-summary";
import type { PostRepo } from "@/lib/facebook-publish";
import type { MediaLink } from "@/lib/share-media";
import type { DetailRepo } from "@/lib/record-detail";
import { getCurrentUserId } from "./supabase/current-user";
import { createSupabaseServerClient } from "./supabase/server";

/** The storage bucket keeps its first name even though it now holds videos too. */
const BUCKET = "record-photos";

const INVENTORY_LIMIT = 50;

const OK: RepoResult = { ok: true };

function isSlot(row: unknown): row is { kind: "photo" | "video"; position: number } {
  if (typeof row !== "object" || row === null) {
    return false;
  }
  const { kind, position } = row as Record<string, unknown>;
  return (kind === "photo" || kind === "video") && typeof position === "number";
}

/** Check and unique violations raised by the database limits (video count, 8 positions). */
function isLimitError(error: { code?: string }): boolean {
  return error.code === "23514" || error.code === "23505";
}

/**
 * The only place that talks to Supabase for records and their media (see AGENTS.md).
 * Everything runs as the signed in user, so row level security applies.
 */
export async function createCaptureRepo(): Promise<CaptureRepo> {
  const supabase = await createSupabaseServerClient();

  return {
    currentUserId: getCurrentUserId,

    async upsertRecord(record) {
      const { error } = await supabase
        .from("records")
        .upsert(
          { id: record.id, title: record.title, artist: record.artist, price_cop: record.priceCop, notes: record.notes },
          { onConflict: "id" },
        );
      return error === null ? OK : { ok: false, reason: "other" };
    },

    async listMedia(recordId) {
      const { data, error } = await supabase.from("record_media").select("kind, position").eq("record_id", recordId);
      if (error !== null) {
        return null;
      }
      const rows: unknown[] = Array.isArray(data) ? data : [];
      return rows.filter(isSlot);
    },

    async createSignedUpload(path) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
      return error === null ? { signedUrl: data.signedUrl } : null;
    },

    async mediaExists(path) {
      const { data, error } = await supabase.storage.from(BUCKET).exists(path);
      return error === null && data;
    },

    async insertMedia(row) {
      const { error } = await supabase.from("record_media").insert({
        id: row.id,
        record_id: row.recordId,
        owner_id: row.ownerId,
        storage_path: row.path,
        position: row.position,
        kind: row.kind,
        duration_seconds: row.durationSeconds,
      });
      if (error === null) {
        return OK;
      }
      return { ok: false, reason: isLimitError(error) ? "limit" : "other" };
    },

    async setStatus(recordId, status) {
      const { data, error } = await supabase.from("records").update({ status }).eq("id", recordId).select("id");
      if (error !== null) {
        return { ok: false, reason: error.message.includes("at least one photo or video") ? "no_media" : "other" };
      }
      return Array.isArray(data) && data.length > 0 ? OK : { ok: false, reason: "other" };
    },

    async deleteMedia(recordId, mediaId) {
      const found = await supabase
        .from("record_media")
        .select("storage_path")
        .eq("id", mediaId)
        .eq("record_id", recordId)
        .maybeSingle();
      const row: unknown = found.data;
      const path = typeof row === "object" && row !== null ? (row as Record<string, unknown>)["storage_path"] : null;
      if (found.error !== null || typeof path !== "string") {
        return { ok: false, reason: found.error === null ? "not_found" : "other" };
      }
      // The row goes first: the database refuses to take the last file off a published record.
      const deleted = await supabase.from("record_media").delete().eq("id", mediaId).eq("record_id", recordId);
      if (deleted.error !== null) {
        return { ok: false, reason: deleted.error.message.includes("at least one photo or video") ? "last_media" : "other" };
      }
      const file = await supabase.storage.from(BUCKET).remove([path]);
      if (file.error !== null) {
        console.error("Stored file could not be removed", path, file.error.message);
      }
      return { ok: true };
    },
  };
}

/**
 * Searches the owner's records (see the `search_records` database function). Returns null when
 * the search could not run, so the screen can say so instead of showing an empty list.
 */
export async function searchInventory(search: Search): Promise<SearchRow[] | null> {
  const supabase = await createSupabaseServerClient();
  const result = await supabase.rpc("search_records", {
    p_query: search.query,
    p_filter: search.filter,
    p_limit: INVENTORY_LIMIT,
  });
  if (result.error !== null) {
    return null;
  }
  const data: unknown = result.data;
  const rows: unknown[] = Array.isArray(data) ? data : [];
  return rows.filter(isSearchRow);
}

const RECORD_COLUMNS =
  "id, title, artist, price_cop, status, notes, updated_at, sold_at, facebook_posted_at, facebook_needs_update, show_price_public";
const STATUSES: readonly string[] = ["draft", "available", "sold", "unavailable"];
const SIGNED_URL_SECONDS = 60 * 60;

function isRecordRow(value: unknown): value is Record<string, unknown> & { id: string; status: RecordStatus } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return typeof row["id"] === "string" && typeof row["status"] === "string" && STATUSES.includes(row["status"]);
}

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Links that work for an hour for storage paths, as a map from path to link. */
async function signedUrlMap(supabase: Client, paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) {
    return new Map();
  }
  const signed = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  return new Map(
    (signed.data ?? []).flatMap((entry) => (entry.path !== null && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : [])),
  );
}

const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

function toDiscRecord(row: Record<string, unknown> & { id: string; status: RecordStatus }, mediaCount: number): DiscRecord {
  return {
    id: row.id,
    title: text(row["title"]),
    artist: text(row["artist"]),
    priceCop: typeof row["price_cop"] === "number" ? row["price_cop"] : null,
    status: row.status,
    notes: text(row["notes"]),
    mediaCount,
    updatedAt: text(row["updated_at"]) ?? "",
    deletedAt: null,
    soldAt: text(row["sold_at"]),
    facebookPostedAt: text(row["facebook_posted_at"]),
    facebookNeedsUpdate: row["facebook_needs_update"] === true,
  };
}

async function readRecordRow(supabase: Client, recordId: string) {
  const found = await supabase.from("records").select(RECORD_COLUMNS).eq("id", recordId).is("deleted_at", null).maybeSingle();
  const row: unknown = found.data;
  return found.error === null && isRecordRow(row) ? row : null;
}

async function readRecord(supabase: Client, recordId: string): Promise<DiscRecord | null> {
  const [row, media] = await Promise.all([
    readRecordRow(supabase, recordId),
    supabase.from("record_media").select("id", { count: "exact", head: true }).eq("record_id", recordId),
  ]);
  return row === null ? null : toDiscRecord(row, media.count ?? 0);
}

/** Reads and edits one record as the signed in user. */
export async function createDetailRepo(): Promise<DetailRepo> {
  const supabase = await createSupabaseServerClient();
  return {
    currentUserId: getCurrentUserId,
    getRecord: (recordId) => readRecord(supabase, recordId),
    async updateFields(recordId, values) {
      const { data, error } = await supabase
        .from("records")
        .update({ title: values.title, artist: values.artist, price_cop: values.priceCop, notes: values.notes })
        .eq("id", recordId)
        .select("id");
      return error === null && Array.isArray(data) && data.length > 0 ? OK : { ok: false, reason: "other" };
    },
    async setStatus(recordId, status) {
      const { data, error } = await supabase.from("records").update({ status }).eq("id", recordId).select("id");
      if (error !== null) {
        return { ok: false, reason: error.message.includes("at least one photo or video") ? "no_media" : "other" };
      }
      return Array.isArray(data) && data.length > 0 ? OK : { ok: false, reason: "other" };
    },
    async setShowPricePublic(recordId, show) {
      const { data, error } = await supabase.from("records").update({ show_price_public: show }).eq("id", recordId).select("id");
      return error === null && Array.isArray(data) && data.length > 0 ? OK : { ok: false, reason: "other" };
    },
    async setDeleted(recordId, deleted) {
      const { data, error } = await supabase
        .from("records")
        .update({ deleted_at: deleted ? new Date().toISOString() : null })
        .eq("id", recordId)
        .select("id");
      return error === null && Array.isArray(data) && data.length > 0 ? OK : { ok: false, reason: "other" };
    },
  };
}

/** True when the record exists and is deleted: the home screen only offers to bring it back then. */
export async function isRecordDeleted(recordId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const found = await supabase.from("records").select("id").eq("id", recordId).not("deleted_at", "is", null).maybeSingle();
  return found.error === null && found.data !== null;
}

export interface MediaView {
  id: string;
  kind: MediaKind;
  url: string;
}

export interface RecordDetail {
  record: DiscRecord;
  media: MediaView[];
  /** Customers see this record's price in the public catalog. */
  showPricePublic: boolean;
}

/** A record with its photos and videos, as links that work for an hour. Null when it does not exist. */
type MediaRow = { id: string; kind: MediaKind; path: string; position: number };

function parseMediaRows(list: unknown[]): MediaRow[] {
  return list.flatMap((entry): MediaRow[] => {
    const row = entry as Record<string, unknown>;
    const kind = row["kind"];
    return typeof row["id"] === "string" &&
      typeof row["storage_path"] === "string" &&
      typeof row["position"] === "number" &&
      (kind === "photo" || kind === "video")
      ? [{ id: row["id"], kind, path: row["storage_path"], position: row["position"] }]
      : [];
  });
}

const MEDIA_COLUMNS = "id, kind, storage_path, position";

export async function loadRecordDetail(recordId: string): Promise<RecordDetail | null> {
  const supabase = await createSupabaseServerClient();
  // The record and its files are asked for together; the file count comes from the list itself.
  const [row, listed] = await Promise.all([
    readRecordRow(supabase, recordId),
    supabase.from("record_media").select(MEDIA_COLUMNS).eq("record_id", recordId).order("position"),
  ]);
  if (row === null) {
    return null;
  }
  const list: unknown[] = Array.isArray(listed.data) ? listed.data : [];
  const items = parseMediaRows(list);
  const urls = await signedUrlMap(
    supabase,
    items.map((item) => item.path),
  );
  const media = items.flatMap((item) => {
    const url = urls.get(item.path);
    return url === undefined ? [] : [{ id: item.id, kind: item.kind, url }];
  });
  return { record: toDiscRecord(row, list.length), media, showPricePublic: row["show_price_public"] === true };
}

export interface RestoredMedia {
  id: string;
  kind: MediaKind;
  url: string;
  position: number;
}

/**
 * The files already uploaded to a draft, so the capture form can show them again after the page
 * is reloaded. Empty when the record does not exist or is no longer a draft.
 */
export async function loadDraftMedia(recordId: string): Promise<RestoredMedia[]> {
  const supabase = await createSupabaseServerClient();
  const [row, listed] = await Promise.all([
    readRecordRow(supabase, recordId),
    supabase.from("record_media").select(MEDIA_COLUMNS).eq("record_id", recordId).order("position"),
  ]);
  if (row === null || row.status !== "draft") {
    return [];
  }
  const items = parseMediaRows(Array.isArray(listed.data) ? listed.data : []);
  const urls = await signedUrlMap(
    supabase,
    items.map((item) => item.path),
  );
  return items.flatMap((item): RestoredMedia[] => {
    const url = urls.get(item.path);
    return url === undefined ? [] : [{ id: item.id, kind: item.kind, url, position: item.position }];
  });
}

export async function createPostRepo(): Promise<PostRepo> {
  const supabase = await createSupabaseServerClient();
  return {
    currentUserId: getCurrentUserId,
    async markPosted(recordIds) {
      const { data, error } = await supabase
        .from("records")
        .update({ facebook_posted_at: new Date().toISOString(), facebook_needs_update: false })
        .in("id", recordIds)
        .select("id");
      return error === null && Array.isArray(data) && data.length === recordIds.length ? OK : { ok: false, reason: "other" };
    },
  };
}

export interface PostItem {
  record: DiscRecord;
  media: MediaLink[];
}

/** The available records among `recordIds` with their files as links, in the order asked. */
export async function loadPostItems(recordIds: string[]): Promise<PostItem[]> {
  if (recordIds.length === 0) {
    return [];
  }
  const supabase = await createSupabaseServerClient();
  const found = await supabase
    .from("records")
    .select(RECORD_COLUMNS)
    .in("id", recordIds)
    .eq("status", "available")
    .is("deleted_at", null);
  const rows: unknown[] = Array.isArray(found.data) ? found.data : [];
  const records = rows.filter(isRecordRow);
  if (records.length === 0) {
    return [];
  }
  const listed = await supabase
    .from("record_media")
    .select("id, record_id, kind, storage_path")
    .in("record_id", records.map((row) => row.id))
    .order("position");
  const list: unknown[] = Array.isArray(listed.data) ? listed.data : [];
  const files = list.flatMap((entry): { id: string; recordId: string; kind: MediaKind; path: string }[] => {
    const row = entry as Record<string, unknown>;
    const kind = row["kind"];
    return typeof row["id"] === "string" &&
      typeof row["record_id"] === "string" &&
      typeof row["storage_path"] === "string" &&
      (kind === "photo" || kind === "video")
      ? [{ id: row["id"], recordId: row["record_id"], kind, path: row["storage_path"] }]
      : [];
  });
  const urls = await signedUrlMap(
    supabase,
    files.map((file) => file.path),
  );
  const byId = new Map(records.map((row) => [row.id, row]));
  return recordIds.flatMap((id): PostItem[] => {
    const row = byId.get(id);
    if (row === undefined) {
      return [];
    }
    const media = files.flatMap((file): MediaLink[] => {
      const url = urls.get(file.path);
      return file.recordId === id && url !== undefined ? [{ id: file.id, kind: file.kind, url }] : [];
    });
    return [{ record: toDiscRecord(row, media.length), media }];
  });
}

/** Pictures for the inventory cards: a link per storage path, in one call. */
export async function signThumbnails(paths: string[]): Promise<Map<string, string>> {
  return signedUrlMap(await createSupabaseServerClient(), [...new Set(paths)]);
}

export interface BatchItemView extends BatchSummary {
  thumbnailUrl: string | null;
}

/**
 * The records of the owner's Facebook batch that can still be posted (available, not deleted), in the order
 * they were added, with a link for each miniature. A record that no longer qualifies just drops out.
 */
export async function loadBatchSummaries(ids: string[]): Promise<BatchItemView[]> {
  if (ids.length === 0) {
    return [];
  }
  const supabase = await createSupabaseServerClient();
  const found = await supabase.from("records").select("id, title, artist").in("id", ids).eq("status", "available").is("deleted_at", null);
  const rows: unknown[] = Array.isArray(found.data) ? found.data : [];
  const records = rows.flatMap((entry): { id: string; title: string | null; artist: string | null }[] => {
    const row = entry as Record<string, unknown>;
    return typeof row["id"] === "string" ? [{ id: row["id"], title: text(row["title"]), artist: text(row["artist"]) }] : [];
  });
  if (records.length === 0) {
    return [];
  }
  const listed = await supabase
    .from("record_media")
    .select("record_id, storage_path, position")
    .in("record_id", records.map((record) => record.id))
    .order("position");
  const files = (Array.isArray(listed.data) ? (listed.data as unknown[]) : []).flatMap((entry): { recordId: string; path: string }[] => {
    const row = entry as Record<string, unknown>;
    return typeof row["record_id"] === "string" && typeof row["storage_path"] === "string"
      ? [{ recordId: row["record_id"], path: row["storage_path"] }]
      : [];
  });
  const summaries = buildBatchSummaries(ids, records, files);
  const urls = await signedUrlMap(
    supabase,
    summaries.flatMap((summary) => (summary.thumbnailPath === null ? [] : [summary.thumbnailPath])),
  );
  return summaries.map((summary) => ({
    ...summary,
    thumbnailUrl: summary.thumbnailPath === null ? null : (urls.get(summary.thumbnailPath) ?? null),
  }));
}

