import { cache } from "react";
import { userIdFromClaims } from "@/lib/claims";
import { createSupabaseServerClient } from "./server";

/**
 * The signed in user's id for this request, or null. The session is checked from the signed token
 * (no round trip to Supabase when the project uses asymmetric keys) and the answer is kept for the
 * rest of the request, so a page and the code it calls do not repeat the check.
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseServerClient();
  return userIdFromClaims(await supabase.auth.getClaims());
});
