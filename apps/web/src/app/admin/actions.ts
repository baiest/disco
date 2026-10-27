"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { restoreRecord } from "@/lib/record-detail";
import { createDetailRepo } from "@/server/records-repo";
import { createSupabaseServerClient } from "@/server/supabase/server";

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** The "Deshacer" on the home screen after a record was deleted: brings it back and clears the notice. */
export async function restoreRecordAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  try {
    await restoreRecord(await createDetailRepo(), { recordId: typeof id === "string" ? id : "" });
  } catch {
    // The list below still tells the owner what is and is not there.
  }
  revalidatePath("/admin");
  redirect("/admin");
}
