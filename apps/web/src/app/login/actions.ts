"use server";

import { redirect } from "next/navigation";
import { requestLoginLink, type LoginLinkResult } from "@/lib/login-link";
import { signInWithPassword, type PasswordLoginResult } from "@/lib/password-login";
import { createSupabaseServerClient } from "@/server/supabase/server";

export type LoginFormState = { status: "idle" } | LoginLinkResult;

export async function sendLoginLink(_previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail : "";

  return requestLoginLink(async () => (await createSupabaseServerClient()).auth, email);
}

export type PasswordFormState = { status: "idle" } | { status: Exclude<PasswordLoginResult, "ok"> };

export async function signInWithPasswordAction(
  _previous: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const result = await signInWithPassword(
    async () => (await createSupabaseServerClient()).auth,
    typeof rawEmail === "string" ? rawEmail : "",
    typeof rawPassword === "string" ? rawPassword : "",
  );
  if (result === "ok") {
    redirect("/admin");
  }
  return { status: result };
}
