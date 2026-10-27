import { describe, expect, it } from "vitest";
import {
  checkAddMedia,
  checkMediaFile,
  kindFromContentType,
  MAX_MEDIA,
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  mediaPath,
  photoTargetSize,
  retryDelayMs,
} from "./media";

const photo = (position: number) => ({ kind: "photo" as const, position });
const video = (position: number) => ({ kind: "video" as const, position });

describe("kindFromContentType", () => {
  it.each([
    ["image/jpeg", "photo"],
    ["image/webp", "photo"],
    ["video/mp4", "video"],
    ["video/quicktime", "video"],
    ["video/webm", "video"],
  ] as const)("%s is a %s", (type, kind) => {
    expect(kindFromContentType(type)).toBe(kind);
  });

  it.each(["image/png", "image/gif", "video/x-matroska", "application/pdf", "", "IMAGE/JPEG"])(
    "does not accept %j",
    (type) => {
      expect(kindFromContentType(type)).toBeNull();
    },
  );
});

describe("checkAddMedia", () => {
  it("gives the first free position", () => {
    expect(checkAddMedia([], "photo")).toEqual({ ok: true, position: 0 });
    expect(checkAddMedia([photo(0), photo(1)], "photo")).toEqual({ ok: true, position: 2 });
  });

  it("fills a gap left by a deleted item", () => {
    expect(checkAddMedia([photo(0), photo(2)], "photo")).toEqual({ ok: true, position: 1 });
  });

  it("refuses a ninth item, whatever its kind", () => {
    const full = Array.from({ length: MAX_MEDIA }, (_, index) => photo(index));
    expect(checkAddMedia(full, "photo")).toEqual({ ok: false, reason: "too_many" });
    expect(checkAddMedia(full, "video")).toEqual({ ok: false, reason: "too_many" });
  });

  it("counts photos and videos together toward the limit of 8", () => {
    const seven = [...Array.from({ length: 6 }, (_, index) => photo(index)), video(6)];
    expect(checkAddMedia(seven, "photo")).toEqual({ ok: true, position: 7 });
  });

  it("allows two videos and refuses a third", () => {
    expect(checkAddMedia([video(0)], "video")).toEqual({ ok: true, position: 1 });
    expect(checkAddMedia([video(0), video(1)], "video")).toEqual({ ok: false, reason: "too_many_videos" });
  });

  it("still allows photos after two videos", () => {
    expect(checkAddMedia([video(0), video(1)], "photo")).toEqual({ ok: true, position: 2 });
  });
});

describe("checkMediaFile", () => {
  it("accepts a normal photo", () => {
    expect(checkMediaFile({ contentType: "image/jpeg", sizeBytes: 400_000 })).toEqual({ ok: true, kind: "photo", durationSeconds: null });
  });

  it("accepts a photo of exactly the size limit and refuses one byte more", () => {
    expect(checkMediaFile({ contentType: "image/webp", sizeBytes: MAX_PHOTO_BYTES })).toMatchObject({ ok: true });
    expect(checkMediaFile({ contentType: "image/webp", sizeBytes: MAX_PHOTO_BYTES + 1 })).toEqual({ ok: false, reason: "too_big" });
  });

  it("accepts a video up to 2 minutes and 50 MB, rounding the duration up", () => {
    expect(checkMediaFile({ contentType: "video/mp4", sizeBytes: 10_000_000, durationSeconds: 119.2 })).toEqual({
      ok: true,
      kind: "video",
      durationSeconds: 120,
    });
    expect(checkMediaFile({ contentType: "video/mp4", sizeBytes: MAX_VIDEO_BYTES, durationSeconds: 120 })).toMatchObject({ ok: true });
  });

  it("refuses a video that is too long, too big or without a known duration", () => {
    expect(checkMediaFile({ contentType: "video/mp4", sizeBytes: 1_000, durationSeconds: 120.5 })).toEqual({ ok: false, reason: "too_long" });
    expect(checkMediaFile({ contentType: "video/mp4", sizeBytes: MAX_VIDEO_BYTES + 1, durationSeconds: 30 })).toEqual({ ok: false, reason: "too_big" });
    expect(checkMediaFile({ contentType: "video/mp4", sizeBytes: 1_000 })).toEqual({ ok: false, reason: "duration_unknown" });
    expect(checkMediaFile({ contentType: "video/mp4", sizeBytes: 1_000, durationSeconds: 0 })).toEqual({ ok: false, reason: "duration_unknown" });
    expect(checkMediaFile({ contentType: "video/mp4", sizeBytes: 1_000, durationSeconds: Number.NaN })).toEqual({ ok: false, reason: "duration_unknown" });
  });

  it("refuses types it does not know and empty files", () => {
    expect(checkMediaFile({ contentType: "image/png", sizeBytes: 100 })).toEqual({ ok: false, reason: "unsupported_type" });
    expect(checkMediaFile({ contentType: "image/jpeg", sizeBytes: 0 })).toEqual({ ok: false, reason: "empty" });
  });
});

describe("photoTargetSize", () => {
  it.each([
    [4000, 3000, 1600, { width: 1600, height: 1200 }],
    [3000, 4000, 1600, { width: 1200, height: 1600 }],
    [1600, 1600, 1600, { width: 1600, height: 1600 }],
    [800, 600, 1600, { width: 800, height: 600 }],
    [5, 4000, 1600, { width: 2, height: 1600 }],
  ])("fits %ix%i within %i as %j", (width, height, max, expected) => {
    expect(photoTargetSize(width, height, max)).toEqual(expected);
  });

  it("never returns a zero side", () => {
    expect(photoTargetSize(1, 100_000, 1600)).toEqual({ width: 1, height: 1600 });
  });

  it.each([[0, 100], [100, 0], [-1, 5], [Number.NaN, 5]])("returns null for %i x %i", (width, height) => {
    expect(photoTargetSize(width, height)).toBeNull();
  });
});

describe("retryDelayMs", () => {
  it("doubles the wait after each failure, up to 4 attempts", () => {
    expect([1, 2, 3].map(retryDelayMs)).toEqual([1000, 2000, 4000]);
  });

  it("gives up after the last attempt", () => {
    expect(retryDelayMs(4)).toBeNull();
    expect(retryDelayMs(10)).toBeNull();
  });

  it("rejects a nonsensical attempt number", () => {
    expect(retryDelayMs(0)).toBeNull();
  });
});

describe("mediaPath", () => {
  it("builds the path the database expects, with the right extension", () => {
    expect(mediaPath("owner", "rec", "m1", "image/jpeg")).toBe("owner/rec/m1.jpg");
    expect(mediaPath("owner", "rec", "m2", "image/webp")).toBe("owner/rec/m2.webp");
    expect(mediaPath("owner", "rec", "m3", "video/mp4")).toBe("owner/rec/m3.mp4");
    expect(mediaPath("owner", "rec", "m4", "video/quicktime")).toBe("owner/rec/m4.mov");
    expect(mediaPath("owner", "rec", "m5", "video/webm")).toBe("owner/rec/m5.webm");
  });

  it("returns null for an unsupported type", () => {
    expect(mediaPath("owner", "rec", "m", "image/png")).toBeNull();
  });
});
