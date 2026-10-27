/** Photos and videos one Facebook post can carry. Kept here so it is easy to change. */
export const MAX_POST_MEDIA = 30;
/** Records in one post: every record has at least one file, so it can never be more than the files. */
export const MAX_POST_RECORDS = MAX_POST_MEDIA;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Record ids from the address (`?ids=a,b` or repeated `ids`). Ignores anything that is not an id and repeated ones. */
export function parseIds(param: string | string[] | undefined): string[] {
  const text = (Array.isArray(param) ? param.join(",") : param) ?? "";
  const ids = text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => UUID.test(part));
  return [...new Set(ids)].slice(0, MAX_POST_RECORDS);
}

export type BatchCheck = { ok: true; total: number } | { ok: false; reason: "empty" | "too_many_media"; total: number };

/** Can these records go in one post? Counts the photos and videos they bring. */
export function checkBatch(records: readonly { mediaCount: number }[]): BatchCheck {
  const total = records.reduce((sum, record) => sum + record.mediaCount, 0);
  if (total === 0) {
    return { ok: false, reason: "empty", total };
  }
  return total > MAX_POST_MEDIA ? { ok: false, reason: "too_many_media", total } : { ok: true, total };
}
