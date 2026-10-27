"use server";

import { parseIds } from "@/lib/facebook-post";
import { loadBatchSummaries, type BatchItemView } from "@/server/records-repo";
import { getCurrentUserId } from "@/server/supabase/current-user";

/** What the batch bar shows: the records still in the batch, with a miniature each. Empty when signed out or on any failure. */
export async function loadBatchSummariesAction(ids: string[]): Promise<BatchItemView[]> {
  try {
    if ((await getCurrentUserId()) === null) {
      return [];
    }
    return await loadBatchSummaries(parseIds(ids.join(",")));
  } catch {
    return [];
  }
}
