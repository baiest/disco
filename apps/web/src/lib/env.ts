export interface SupabaseEnv {
  url: string;
  key: string;
}

type Source = Record<string, string | undefined>;

function isUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** Reads and checks the public Supabase settings. The key is the publishable key, never the secret one. */
export function readSupabaseEnv(source: Source): SupabaseEnv {
  const url = source["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
  const key = source["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ?? "";

  const missing = [
    url === "" ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    key === "" ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : null,
  ].filter((name) => name !== null);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
  if (!isUrl(url)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL");
  }
  if (key.startsWith("sb_secret_")) {
    throw new Error("A secret key was provided; only the publishable key may be used in the app");
  }
  return { url, key };
}
