export interface PasswordClient {
  signInWithPassword: (args: {
    email: string;
    password: string;
  }) => Promise<{ error: { status?: number | undefined; message: string } | null }>;
}

export type PasswordLoginResult = "ok" | "invalid_input" | "wrong_credentials" | "try_later";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 200;

function isRefusal(status: number | undefined): boolean {
  return status !== undefined && status >= 400 && status < 500 && status !== 429;
}

/**
 * Signs in with an email and a password. A refusal always reads "wrong data", whether the email
 * is unknown or the password is wrong, so the form does not reveal who has access. Rate limits,
 * server errors and network failures read "try later".
 */
export async function signInWithPassword(
  getClient: () => PasswordClient | Promise<PasswordClient>,
  rawEmail: string,
  password: string,
): Promise<PasswordLoginResult> {
  const email = rawEmail.trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email) || password === "" || password.length > MAX_PASSWORD_LENGTH) {
    return "invalid_input";
  }

  try {
    const client = await getClient();
    const { error } = await client.signInWithPassword({ email, password });
    if (error === null) {
      return "ok";
    }
    return isRefusal(error.status) ? "wrong_credentials" : "try_later";
  } catch {
    return "try_later";
  }
}
