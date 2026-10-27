import type { MediaKind } from "@disco/domain";
import {
  isPublicRow,
  toPublicRecord,
  type PublicRecord,
} from "@/lib/public-catalog";
import { createSupabasePublicClient } from "./supabase/public";

/** The storage bucket keeps its first name even though it now holds videos too. */
const BUCKET = "record-photos";
const LIST_LIMIT = 60;
const SIGNED_URL_SECONDS = 60 * 60;

type Client = ReturnType<typeof createSupabasePublicClient>;

async function signedUrlMap(supabase: Client, paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) {
    return new Map();
  }
  const signed = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  return new Map(
    (signed.data ?? []).flatMap((entry) => (entry.path !== null && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : [])),
  );
}

/** The records a visitor may see, matching the search text. Null when the search could not run. */
export async function listPublicRecords(query: string): Promise<PublicRecord[] | null> {
  try {
    const supabase = createSupabasePublicClient();
    const result = await supabase.rpc("public_records", { p_query: query, p_limit: LIST_LIMIT });
    if (result.error !== null) {
      return null;
    }
    const data: unknown = result.data;
    const rows: unknown[] = Array.isArray(data) ? data : [];
    return rows.filter(isPublicRow).map(toPublicRecord);
  } catch {
    // Missing settings or no connection: the page says it could not load, instead of failing.
    return null;
  }
}

/** Links for the pictures of the list, in one call. A path without a link simply has no picture. */
export async function signPublicPictures(paths: string[]): Promise<Map<string, string>> {
  try {
    return await signedUrlMap(createSupabasePublicClient(), [...new Set(paths)]);
  } catch {
    return new Map();
  }
}

export interface PublicMedia {
  id: string;
  kind: MediaKind;
  url: string;
}

export interface PublicDetail {
  record: PublicRecord;
  media: PublicMedia[];
}

/** One public record with its photos and videos. Null when it does not exist or is not public. */
export async function loadPublicRecord(recordId: string): Promise<PublicDetail | null> {
  try {
    return await readPublicRecord(recordId);
  } catch {
    return null;
  }
}

async function readPublicRecord(recordId: string): Promise<PublicDetail | null> {
  const supabase = createSupabasePublicClient();
  const [found, listed] = await Promise.all([
    supabase.rpc("public_record", { p_id: recordId }),
    supabase.rpc("public_record_media", { p_record_id: recordId }),
  ]);
  const data: unknown = found.data;
  const first: unknown = Array.isArray(data) ? data[0] : undefined;
  if (found.error !== null || !isPublicRow(first)) {
    return null;
  }
  const files: unknown[] = Array.isArray(listed.data) ? (listed.data as unknown[]) : [];
  const items = files.flatMap((entry): { id: string; kind: MediaKind; path: string }[] => {
    const row = entry as Record<string, unknown>;
    const kind = row["kind"];
    return typeof row["id"] === "string" && typeof row["storage_path"] === "string" && (kind === "photo" || kind === "video")
      ? [{ id: row["id"], kind, path: row["storage_path"] }]
      : [];
  });
  const urls = await signedUrlMap(
    supabase,
    items.map((item) => item.path),
  );
  const media = items.flatMap((item): PublicMedia[] => {
    const url = urls.get(item.path);
    return url === undefined ? [] : [{ id: item.id, kind: item.kind, url }];
  });
  return { record: toPublicRecord(first), media };
}
