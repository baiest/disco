import type { CaptureRepo, RepoResult } from "@/lib/capture";
import { createSupabaseServerClient } from "./supabase/server";

/** The storage bucket keeps its first name even though it now holds videos too. */
const BUCKET = "record-photos";

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
    async currentUserId() {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },

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
  };
}
