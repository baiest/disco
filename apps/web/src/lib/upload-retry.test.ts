import { describe, expect, it, vi } from "vitest";
import { uploadWithRetry } from "./upload-retry";

describe("uploadWithRetry", () => {
  it("succeeds on the first try without waiting", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const wait = vi.fn().mockResolvedValue(undefined);
    expect(await uploadWithRetry(send, wait)).toEqual({ ok: true, attempts: 1 });
    expect(wait).not.toHaveBeenCalled();
  });

  it("retries with growing waits and then succeeds", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, retryable: true })
      .mockResolvedValueOnce({ ok: false, retryable: true })
      .mockResolvedValueOnce({ ok: true });
    const wait = vi.fn().mockResolvedValue(undefined);
    const onRetry = vi.fn();
    expect(await uploadWithRetry(send, wait, onRetry)).toEqual({ ok: true, attempts: 3 });
    expect(wait.mock.calls).toEqual([[1000], [2000]]);
    expect(onRetry.mock.calls).toEqual([[1, 1000], [2, 2000]]);
  });

  it("gives up after 4 attempts", async () => {
    const send = vi.fn().mockResolvedValue({ ok: false, retryable: true });
    const wait = vi.fn().mockResolvedValue(undefined);
    expect(await uploadWithRetry(send, wait)).toEqual({ ok: false, attempts: 4 });
    expect(send).toHaveBeenCalledTimes(4);
    expect(wait.mock.calls).toEqual([[1000], [2000], [4000]]);
  });

  it("stops at once on an error that retrying cannot fix", async () => {
    const send = vi.fn().mockResolvedValue({ ok: false, retryable: false });
    const wait = vi.fn();
    expect(await uploadWithRetry(send, wait)).toEqual({ ok: false, attempts: 1 });
    expect(wait).not.toHaveBeenCalled();
  });

  it("treats a send that throws as a retryable failure", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ ok: true });
    const wait = vi.fn().mockResolvedValue(undefined);
    expect(await uploadWithRetry(send, wait)).toEqual({ ok: true, attempts: 2 });
  });
});
