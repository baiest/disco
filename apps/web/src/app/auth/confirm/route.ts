import { NextResponse, type NextRequest } from "next/server";
import { confirmLogin } from "@/lib/confirm-login";
import { createSupabaseServerClient } from "@/server/supabase/server";

/** Target of the link in the login email. Works in any browser: no PKCE cookie is needed. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const supabase = await createSupabaseServerClient();

  const result = await confirmLogin(supabase.auth, searchParams.get("token_hash"), searchParams.get("type"));

  const destination = result === "ok" ? "/admin" : `/login?error=${result}`;
  return NextResponse.redirect(new URL(destination, request.url));
}
