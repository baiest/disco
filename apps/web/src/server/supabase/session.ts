import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "./config";

export interface SessionCheck {
  /** Response that carries any refreshed session cookies. */
  response: NextResponse;
  isSignedIn: boolean;
}

/** Refreshes the session cookies on a request and tells whether the visitor is signed in. */
export async function checkSession(request: NextRequest): Promise<SessionCheck> {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseConfig();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  return { response, isSignedIn: data.user !== null };
}
