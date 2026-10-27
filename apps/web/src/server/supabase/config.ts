import { readSupabaseEnv, type SupabaseEnv } from "@/lib/env";

/** The public Supabase settings, read from the server environment. */
export function supabaseConfig(): SupabaseEnv {
  return readSupabaseEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  });
}
