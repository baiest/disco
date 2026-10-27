import type { RepoResult } from "./capture";
import { MAX_POST_RECORDS } from "./facebook-post";

export interface PostRepo {
  currentUserId: () => Promise<string | null>;
  /** Sets the posting date to now and clears the "post is out of date" flag. */
  markPosted: (recordIds: string[]) => Promise<RepoResult>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MarkPostedOutcome = { ok: true } | { ok: false; reason: "invalid_ids" | "unauthenticated" | "failed" };

/** The owner posted these records on Facebook by hand; remember it. */
export async function markPosted(repo: PostRepo, recordIds: string[]): Promise<MarkPostedOutcome> {
  if (recordIds.length === 0 || recordIds.length > MAX_POST_RECORDS || !recordIds.every((id) => UUID.test(id))) {
    return { ok: false, reason: "invalid_ids" };
  }
  if ((await repo.currentUserId()) === null) {
    return { ok: false, reason: "unauthenticated" };
  }
  const saved = await repo.markPosted(recordIds);
  return saved.ok ? { ok: true } : { ok: false, reason: "failed" };
}
