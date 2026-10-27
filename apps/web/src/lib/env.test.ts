import { describe, expect, it } from "vitest";
import { readSupabaseEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
};

describe("readSupabaseEnv", () => {
  it("returns the url and the publishable key", () => {
    expect(readSupabaseEnv(valid)).toEqual({ url: "https://abc.supabase.co", key: "sb_publishable_abc" });
  });

  it("names every missing variable", () => {
    expect(() => readSupabaseEnv({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL.*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/s,
    );
  });

  it("treats empty values as missing", () => {
    expect(() => readSupabaseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "" })).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("refuses a URL that is not http(s)", () => {
    expect(() => readSupabaseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toThrow(/valid URL/);
  });

  it("refuses a secret key, which must never reach the app", () => {
    expect(() =>
      readSupabaseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc" }),
    ).toThrow(/secret key/);
  });
});
