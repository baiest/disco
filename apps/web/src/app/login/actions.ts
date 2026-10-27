"use server";

import { requestLoginLink, type LoginLinkResult } from "@/lib/login-link";
import { createSupabaseServerClient } from "@/server/supabase/server";

export type LoginFormState = { status: "idle" } | LoginLinkResult;

export async function sendLoginLink(_previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail : "";

  const supabase = await createSupabaseServerClient();
  return requestLoginLink(supabase.auth, email);
}
