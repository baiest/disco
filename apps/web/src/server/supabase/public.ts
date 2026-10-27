import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

/**
 * Supabase client for visitors without an account: no cookies and no session, so the public pages
 * never depend on who is looking. It can only call the public functions and read public files.
 */
export function createSupabasePublicClient() {
  const { url, key } = supabaseConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
