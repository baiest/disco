export interface VerifyClient {
  verifyOtp: (args: { token_hash: string; type: LinkType }) => Promise<{ error: { message: string } | null }>;
}

const LINK_TYPES = ["email", "magiclink", "invite"] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export type ConfirmResult = "ok" | "invalid_link" | "expired_link";

function isLinkType(value: string): value is LinkType {
  return (LINK_TYPES as readonly string[]).includes(value);
}

/** Exchanges the token from the emailed link for a session. Only login-type links are accepted. */
export async function confirmLogin(
  client: VerifyClient,
  tokenHash: string | null,
  type: string | null,
): Promise<ConfirmResult> {
  if (tokenHash === null || tokenHash === "" || type === null || !isLinkType(type)) {
    return "invalid_link";
  }

  try {
    const { error } = await client.verifyOtp({ token_hash: tokenHash, type });
    return error === null ? "ok" : "expired_link";
  } catch {
    return "expired_link";
  }
}
