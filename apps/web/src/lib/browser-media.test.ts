import { afterEach, describe, expect, it, vi } from "vitest";
import { preparePhoto, readVideoDuration, sendToSignedUrl } from "./browser-media";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

class FakeRequest {
  static last: FakeRequest;
  status = 200;
  headers: Record<string, string> = {};
  body: unknown;
  method = "";
  url = "";
  upload: { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
  onload?: () => void;
  onerror?: () => void;
  ontimeout?: () => void;
  constructor() {
    FakeRequest.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
}

describe("sendToSignedUrl", () => {
  function start(onProgress = vi.fn()) {
    vi.stubGlobal("XMLHttpRequest", FakeRequest);
    const result = sendToSignedUrl("https://s/u", new Blob(["x"]), "key", onProgress);
    return { request: FakeRequest.last, result, onProgress };
  }

  it("sends the file as the storage library does, with the key", () => {
    const { request } = start();
    expect(request.method).toBe("PUT");
    expect(request.url).toBe("https://s/u");
    expect(request.headers["apikey"]).toBe("key");
    expect(request.body).toBeInstanceOf(FormData);
    expect((request.body as FormData).get("")).toBeInstanceOf(Blob);
  });

  it("reports progress as a percentage and ignores unknown totals", () => {
    const { request, onProgress } = start();
    request.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 4 });
    request.upload.onprogress?.({ lengthComputable: false, loaded: 1, total: 0 });
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(25);
  });

  it("succeeds on a 2xx answer", async () => {
    const { request, result } = start();
    request.status = 200;
    request.onload?.();
    await expect(result).resolves.toEqual({ ok: true });
  });

  it.each([
    [400, false],
    [403, false],
    [408, true],
    [429, true],
    [500, true],
    [503, true],
    [0, true],
  ])("treats status %i as retryable=%s", async (status, retryable) => {
    const { request, result } = start();
    request.status = status;
    request.onload?.();
    await expect(result).resolves.toEqual({ ok: false, retryable });
  });

  it("retries after a network error or a timeout", async () => {
    const first = start();
    first.request.onerror?.();
    await expect(first.result).resolves.toEqual({ ok: false, retryable: true });
    const second = start();
    second.request.ontimeout?.();
    await expect(second.result).resolves.toEqual({ ok: false, retryable: true });
  });
});

describe("readVideoDuration", () => {
  function stubVideo(event: "loadedmetadata" | "error", duration: number) {
    URL.createObjectURL = vi.fn(() => "blob:v");
    const revoke = vi.fn();
    URL.revokeObjectURL = revoke;
    const video: { onloadedmetadata?: () => void; onerror?: () => void; duration: number; preload?: string; src?: string } = { duration };
    vi.spyOn(document, "createElement").mockReturnValue(video as unknown as HTMLElement);
    return { video, revoke, fire: () => (event === "error" ? video.onerror?.() : video.onloadedmetadata?.()) };
  }

  it("reads the duration from the metadata", async () => {
    const { fire, revoke } = stubVideo("loadedmetadata", 12.5);
    const result = readVideoDuration(new Blob(["x"]));
    fire();
    await expect(result).resolves.toBe(12.5);
    expect(revoke).toHaveBeenCalledWith("blob:v");
  });

  it("gives nothing when the duration is not a number", async () => {
    const { fire } = stubVideo("loadedmetadata", Number.POSITIVE_INFINITY);
    const result = readVideoDuration(new Blob(["x"]));
    fire();
    await expect(result).resolves.toBeUndefined();
  });

  it("gives nothing when the video cannot be read", async () => {
    const { fire } = stubVideo("error", 0);
    const result = readVideoDuration(new Blob(["x"]));
    fire();
    await expect(result).resolves.toBeUndefined();
  });
});

describe("preparePhoto", () => {
  function stubImage(width: number, height: number, blob: Blob | null) {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn(() => Promise.resolve({ width, height, close })));
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback: (b: Blob | null) => void) => {
        callback(blob);
      },
    };
    vi.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLElement);
    return { canvas, drawImage, close };
  }

  it("scales a large photo down and re-encodes it as JPEG", async () => {
    const { canvas, drawImage, close } = stubImage(3200, 2400, new Blob(["jpeg"]));
    const result = await preparePhoto(new Blob(["raw"]));
    expect(result).toMatchObject({ contentType: "image/jpeg", sizeBytes: 4 });
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(1200);
    expect(drawImage).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it("gives nothing when the photo cannot be encoded", async () => {
    stubImage(100, 100, null);
    await expect(preparePhoto(new Blob(["raw"]))).resolves.toBeNull();
  });

  it("gives nothing for an empty image", async () => {
    const { close } = stubImage(0, 0, new Blob(["x"]));
    await expect(preparePhoto(new Blob(["raw"]))).resolves.toBeNull();
    expect(close).toHaveBeenCalled();
  });

  it("gives nothing when the browser cannot decode the file", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(() => Promise.reject(new Error("bad"))));
    await expect(preparePhoto(new Blob(["raw"]))).resolves.toBeNull();
  });
});
