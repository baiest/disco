"use server";

import { es } from "@/copy/es";
import { requestLoginLink } from "@/lib/login-link";
import { createSupabaseServerClient } from "@/server/supabase/server";

export interface LoginFormState {
  message: string | null;
  sent: boolean;
}

export async function sendLoginLink(_previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail : "";

  const supabase = await createSupabaseServerClient();
  const result = await requestLoginLink(supabase.auth, email);

  switch (result.status) {
    case "sent":
      return { message: es.login.sent, sent: true };
    case "invalid_email":
      return { message: es.login.invalidEmail, sent: false };
    case "try_later":
      return { message: es.login.tryLater, sent: false };
  }
}
