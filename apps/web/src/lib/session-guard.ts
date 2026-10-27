/**
 * Runs a session check and, if it fails (for example because the Supabase settings
 * are missing), treats the visitor as signed out instead of crashing. Public pages
 * such as the login keep working, and protected ones send the visitor to the login.
 */
export async function sessionOrSignedOut<T extends object>(
  check: () => Promise<{ isSignedIn: boolean } & T>,
  fallback: T,
  onError: (error: unknown) => void,
): Promise<{ isSignedIn: boolean } & T> {
  try {
    return await check();
  } catch (error) {
    onError(error);
    return { isSignedIn: false, ...fallback };
  }
}
