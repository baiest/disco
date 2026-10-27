export interface OtpClient {
  signInWithOtp: (args: {
    email: string;
    options: { shouldCreateUser: false };
  }) => Promise<{ error: { status?: number | undefined; message: string } | null }>;
}

export type LoginLinkResult = { status: "sent" } | { status: "invalid_email" } | { status: "try_later" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A 4xx other than rate limiting means "this address cannot log in"; anything else is a failure on our side. */
function isRefusal(status: number | undefined): boolean {
  return status !== undefined && status >= 400 && status < 500 && status !== 429;
}

/**
 * Asks Supabase to email a login link. Never creates users, and answers "sent"
 * even for an unauthorised address so the form does not reveal who has access.
 */
export async function requestLoginLink(client: OtpClient, rawEmail: string): Promise<LoginLinkResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { status: "invalid_email" };
  }

  try {
    const { error } = await client.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error !== null && !isRefusal(error.status)) {
      return { status: "try_later" };
    }
    return { status: "sent" };
  } catch {
    return { status: "try_later" };
  }
}
