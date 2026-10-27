import { describe, expect, it, vi } from "vitest";
import { confirmLogin, type VerifyClient } from "./confirm-login";

function fakeClient(error: { message: string } | null = null): VerifyClient & {
  verifyOtp: ReturnType<typeof vi.fn>;
} {
  return { verifyOtp: vi.fn().mockResolvedValue({ error }) };
}

describe("confirmLogin", () => {
  it.each([
    [null, "email"],
    ["", "email"],
    ["abc", null],
    ["abc", ""],
  ])("rejects a link with token %j and type %j", async (tokenHash, type) => {
    const client = fakeClient();
    expect(await confirmLogin(client, tokenHash, type)).toBe("invalid_link");
    expect(client.verifyOtp).not.toHaveBeenCalled();
  });

  it.each(["recovery", "signup", "email_change", "sms", "nonsense"])(
    "refuses the link type %s",
    async (type) => {
      const client = fakeClient();
      expect(await confirmLogin(client, "abc", type)).toBe("invalid_link");
      expect(client.verifyOtp).not.toHaveBeenCalled();
    },
  );

  it.each(["email", "magiclink", "invite"])("verifies a %s link", async (type) => {
    const client = fakeClient();
    expect(await confirmLogin(client, "abc", type)).toBe("ok");
    expect(client.verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type });
  });

  it("reports an expired or used link", async () => {
    const client = fakeClient({ message: "Token has expired or is invalid" });
    expect(await confirmLogin(client, "abc", "email")).toBe("expired_link");
  });

  it("reports an expired link when the call throws", async () => {
    const client: VerifyClient = { verifyOtp: vi.fn().mockRejectedValue(new Error("offline")) };
    expect(await confirmLogin(client, "abc", "email")).toBe("expired_link");
  });
});
