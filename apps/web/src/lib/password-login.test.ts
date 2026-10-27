import { describe, expect, it, vi } from "vitest";
import { signInWithPassword, type PasswordClient } from "./password-login";

function fakeClient(error: { status?: number; message: string } | null = null): PasswordClient & {
  signInWithPassword: ReturnType<typeof vi.fn>;
} {
  return { signInWithPassword: vi.fn().mockResolvedValue({ error }) };
}

describe("signInWithPassword", () => {
  it.each([
    ["", "secret"],
    ["   ", "secret"],
    ["plain", "secret"],
    ["a@b", "secret"],
    ["papa@example.com", ""],
  ])("rejects %j / %j without calling Supabase", async (email, password) => {
    const client = fakeClient();
    expect(await signInWithPassword(() => client, email, password)).toBe("invalid_input");
    expect(client.signInWithPassword).not.toHaveBeenCalled();
  });

  it("refuses oversized input before doing any work on it", async () => {
    const client = fakeClient();
    expect(await signInWithPassword(() => client, `${"a".repeat(250)}@example.com`, "secret")).toBe("invalid_input");
    expect(await signInWithPassword(() => client, "papa@example.com", "x".repeat(300))).toBe("invalid_input");
    expect(client.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in with the email trimmed and lower-cased and the password untouched", async () => {
    const client = fakeClient();
    expect(await signInWithPassword(() => client, "  Papa@Example.COM ", " Secret 1 ")).toBe("ok");
    expect(client.signInWithPassword).toHaveBeenCalledWith({ email: "papa@example.com", password: " Secret 1 " });
  });

  it("says the data is wrong on a refusal, the same for an unknown email and a wrong password", async () => {
    const client = fakeClient({ status: 400, message: "Invalid login credentials" });
    expect(await signInWithPassword(() => client, "papa@example.com", "nope")).toBe("wrong_credentials");
    const unauthorised = fakeClient({ status: 422, message: "whatever" });
    expect(await signInWithPassword(() => unauthorised, "papa@example.com", "nope")).toBe("wrong_credentials");
  });

  it.each([0, 429, 500, 503])("asks to try later on a %i", async (status) => {
    const client = fakeClient({ status, message: "boom" });
    expect(await signInWithPassword(() => client, "papa@example.com", "secret")).toBe("try_later");
  });

  it("asks to try later with no status, when the call throws, or when the client cannot be made", async () => {
    expect(await signInWithPassword(() => fakeClient({ message: "fetch failed" }), "papa@example.com", "secret")).toBe("try_later");
    const throwing: PasswordClient = { signInWithPassword: vi.fn().mockRejectedValue(new Error("offline")) };
    expect(await signInWithPassword(() => throwing, "papa@example.com", "secret")).toBe("try_later");
    expect(
      await signInWithPassword(
        () => {
          throw new Error("Missing environment variables");
        },
        "papa@example.com",
        "secret",
      ),
    ).toBe("try_later");
  });
});
