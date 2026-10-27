import { describe, expect, it, vi } from "vitest";
import { requestLoginLink, type OtpClient } from "./login-link";

function fakeClient(error: { status?: number; message: string } | null = null): OtpClient & {
  signInWithOtp: ReturnType<typeof vi.fn>;
} {
  return { signInWithOtp: vi.fn().mockResolvedValue({ error }) };
}

describe("requestLoginLink", () => {
  it.each(["", "   ", "plain", "a@b", "@example.com", "two words@example.com"])(
    "rejects %j without calling Supabase",
    async (email) => {
      const client = fakeClient();
      expect(await requestLoginLink(client, email)).toEqual({ status: "invalid_email" });
      expect(client.signInWithOtp).not.toHaveBeenCalled();
    },
  );

  it("asks Supabase for a link without creating users, with the email trimmed and lower-cased", async () => {
    const client = fakeClient();
    const result = await requestLoginLink(client, "  Papa@Example.COM ");
    expect(result).toEqual({ status: "sent" });
    expect(client.signInWithOtp).toHaveBeenCalledWith({
      email: "papa@example.com",
      options: { shouldCreateUser: false },
    });
  });

  it("answers the same way when the email is not authorized, so nothing leaks", async () => {
    const client = fakeClient({ status: 422, message: "Signups not allowed for otp" });
    expect(await requestLoginLink(client, "stranger@example.com")).toEqual({ status: "sent" });
  });

  it.each([0, 429, 500, 503])("asks to try later on a %i", async (status) => {
    const client = fakeClient({ status, message: "boom" });
    expect(await requestLoginLink(client, "papa@example.com")).toEqual({ status: "try_later" });
  });

  it("asks to try later when there is no status, such as a network failure", async () => {
    const client = fakeClient({ message: "fetch failed" });
    expect(await requestLoginLink(client, "papa@example.com")).toEqual({ status: "try_later" });
  });

  it("asks to try later when the call itself throws", async () => {
    const client: OtpClient = { signInWithOtp: vi.fn().mockRejectedValue(new Error("offline")) };
    expect(await requestLoginLink(client, "papa@example.com")).toEqual({ status: "try_later" });
  });
});
