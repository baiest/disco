import { describe, expect, it, vi } from "vitest";
import { sessionOrSignedOut } from "./session-guard";

describe("sessionOrSignedOut", () => {
  it("returns the session check when it works", async () => {
    const onError = vi.fn();
    const result = await sessionOrSignedOut(() => Promise.resolve({ isSignedIn: true, tag: "real" }), { tag: "fallback" }, onError);
    expect(result).toEqual({ isSignedIn: true, tag: "real" });
    expect(onError).not.toHaveBeenCalled();
  });

  it("treats the visitor as signed out, and reports why, when the check fails", async () => {
    const failure = new Error("Missing environment variables");
    const onError = vi.fn();
    const result = await sessionOrSignedOut(() => Promise.reject(failure), { tag: "fallback" }, onError);
    expect(result).toEqual({ isSignedIn: false, tag: "fallback" });
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it("also covers a check that throws before returning a promise", async () => {
    const onError = vi.fn();
    const result = await sessionOrSignedOut(
      () => {
        throw new Error("boom");
      },
      { tag: "fallback" },
      onError,
    );
    expect(result.isSignedIn).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
