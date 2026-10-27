"use server";

import { revalidatePath } from "next/cache";
import { markPosted, type MarkPostedOutcome } from "@/lib/facebook-publish";
import { createPostRepo } from "@/server/records-repo";

export async function markPostedAction(recordIds: string[]): Promise<MarkPostedOutcome> {
  try {
    const result = await markPosted(await createPostRepo(), recordIds);
    revalidatePath("/admin");
    revalidatePath("/admin/publish");
    return result;
  } catch {
    return { ok: false, reason: "failed" };
  }
}
