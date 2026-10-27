import { describe, expect, it, vi } from "vitest";
import type { RegisterResult, UploadResult } from "./capture";
import { uploadMedia, type UploadMediaDeps, type UploadMediaJob } from "./upload-media";

const job: UploadMediaJob = {
  recordId: "r1",
  mediaId: "m1",
  blob: new Blob(["x"]),
  contentType: "image/jpeg",
  sizeBytes: 1,
};

const granted: UploadResult = {
  ok: true,
  upload: { path: "p", signedUrl: "https://s/u", position: 0, kind: "photo", durationSeconds: null },
};

function deps(overrides: Partial<UploadMediaDeps> = {}): UploadMediaDeps {
  return {
    requestUpload: vi.fn(() => Promise.resolve(granted)),
    registerMedia: vi.fn((): Promise<RegisterResult> => Promise.resolve({ ok: true, position: 0 })),
    send: vi.fn(() => Promise.resolve({ ok: true as const })),
    wait: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe("uploadMedia", () => {
  it("asks for permission, uploads, then registers the file", async () => {
    const d = deps();
    const result = await uploadMedia(d, job, { onProgress: vi.fn(), onRetry: vi.fn() });
    expect(result).toEqual({ ok: true, position: 0 });
    expect(d.send).toHaveBeenCalledWith("https://s/u", job.blob, expect.any(Function));
    expect(d.registerMedia).toHaveBeenCalledWith({
      recordId: "r1",
      mediaId: "m1",
      contentType: "image/jpeg",
      sizeBytes: 1,
    });
  });

  it("sends the video duration along", async () => {
    const d = deps();
    await uploadMedia(d, { ...job, durationSeconds: 12 }, { onProgress: vi.fn(), onRetry: vi.fn() });
    expect(d.requestUpload).toHaveBeenCalledWith(expect.objectContaining({ durationSeconds: 12 }));
  });

  it("stops with the server's reason when permission is refused", async () => {
    const d = deps({ requestUpload: vi.fn(() => Promise.resolve({ ok: false as const, reason: "too_many" as const })) });
    const result = await uploadMedia(d, job, { onProgress: vi.fn(), onRetry: vi.fn() });
    expect(result).toEqual({ ok: false, reason: "too_many" });
    expect(d.send).not.toHaveBeenCalled();
    expect(d.registerMedia).not.toHaveBeenCalled();
  });

  it("retries a weak connection and reports each retry", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, retryable: true })
      .mockResolvedValueOnce({ ok: true });
    const onRetry = vi.fn();
    const result = await uploadMedia(deps({ send }), job, { onProgress: vi.fn(), onRetry });
    expect(result.ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(2);
  });

  it("fails with 'failed' and does not register when the upload gives up", async () => {
    const d = deps({ send: vi.fn(() => Promise.resolve({ ok: false as const, retryable: false })) });
    const result = await uploadMedia(d, job, { onProgress: vi.fn(), onRetry: vi.fn() });
    expect(result).toEqual({ ok: false, reason: "failed" });
    expect(d.registerMedia).not.toHaveBeenCalled();
  });

  it("passes on the server's reason when registering fails", async () => {
    const d = deps({ registerMedia: vi.fn(() => Promise.resolve({ ok: false as const, reason: "not_uploaded" as const })) });
    const result = await uploadMedia(d, job, { onProgress: vi.fn(), onRetry: vi.fn() });
    expect(result).toEqual({ ok: false, reason: "not_uploaded" });
  });

  it("forwards progress", async () => {
    const onProgress = vi.fn();
    const send = vi.fn((_url: string, _blob: Blob, progress: (p: number) => void) => {
      progress(40);
      return Promise.resolve({ ok: true as const });
    });
    await uploadMedia(deps({ send }), job, { onProgress, onRetry: vi.fn() });
    expect(onProgress).toHaveBeenCalledWith(40);
  });

  it("turns a thrown error into 'failed'", async () => {
    const d = deps({ requestUpload: vi.fn(() => Promise.reject(new Error("net"))) });
    const result = await uploadMedia(d, job, { onProgress: vi.fn(), onRetry: vi.fn() });
    expect(result).toEqual({ ok: false, reason: "failed" });
  });
});
