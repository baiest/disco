export interface OtpClient {
  signInWithOtp: (args: {
    email: string;
    options: { shouldCreateUser: false };
  }) => Promise<{ error: { status?: number | undefined; message: string } | null }>;
}

export type LoginLinkResult = { status: "sent" } | { status: "invalid_email" } | { status: "try_later" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The longest address an email can have. Longer input is refused before any pattern runs on it. */
const MAX_EMAIL_LENGTH = 254;

function isRefusal(status: number | undefined): boolean {
  return status !== undefined && status >= 400 && status < 500 && status !== 429;
}

/**
 * Asks Supabase to email a login link. Never creates users, and answers "sent"
 * even for an unauthorised address so the form does not reveal who has access.
 * `getClient` may fail (for example when the project settings are missing); that
 * counts as "try later" instead of crashing the page.
 */
export async function requestLoginLink(
  getClient: () => OtpClient | Promise<OtpClient>,
  rawEmail: string,
): Promise<LoginLinkResult> {
  const email = rawEmail.trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { status: "invalid_email" };
  }

  try {
    const client = await getClient();
    const { error } = await client.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error !== null && !isRefusal(error.status)) {
      return { status: "try_later" };
    }
    return { status: "sent" };
  } catch {
    return { status: "try_later" };
  }
}
