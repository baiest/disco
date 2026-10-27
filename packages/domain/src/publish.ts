import type { DiscRecord } from "./types";

export type PublishResult = { ok: true } | { ok: false; reason: "no_media" };

/** A record can be published with just a photo; every other field is optional. */
export function canPublish(record: DiscRecord): PublishResult {
  return record.mediaCount > 0 ? { ok: true } : { ok: false, reason: "no_media" };
}
