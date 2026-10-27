/** The shape of what `auth.getClaims()` answers, reduced to what the app reads. */
export interface ClaimsResult {
  data: { claims: Record<string, unknown> } | null;
  error: { message: string } | null;
}

/** The signed in user's id, or null when there is no valid session. */
export function userIdFromClaims(result: ClaimsResult): string | null {
  if (result.error !== null || result.data === null) {
    return null;
  }
  const { sub } = result.data.claims;
  return typeof sub === "string" && sub !== "" ? sub : null;
}
