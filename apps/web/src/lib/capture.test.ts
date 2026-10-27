import { describe, expect, it, vi } from "vitest";
import { registerMedia, requestUpload, saveRecord, type CaptureRepo } from "./capture";

const USER = "11111111-1111-4111-8111-111111111111";
const RECORD = "22222222-2222-4222-8222-222222222222";
const MEDIA = "33333333-3333-4333-8333-333333333333";

function fakeRepo(overrides: Partial<CaptureRepo> = {}): CaptureRepo & { [K in keyof CaptureRepo]: ReturnType<typeof vi.fn> } {
  return {
    currentUserId: vi.fn().mockResolvedValue(USER),
    upsertRecord: vi.fn().mockResolvedValue({ ok: true }),
    listMedia: vi.fn().mockResolvedValue([]),
    createSignedUpload: vi.fn().mockResolvedValue({ signedUrl: "https://storage.test/upload?token=abc" }),
    mediaExists: vi.fn().mockResolvedValue(true),
    insertMedia: vi.fn().mockResolvedValue({ ok: true }),
    setStatus: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  } as never;
}

const emptyInput = { title: "", artist: "", priceText: "", notes: "" };

describe("saveRecord", () => {
  it("saves a draft with the cleaned values and does not change its status", async () => {
    const repo = fakeRepo();
    const result = await saveRecord(repo, {
      recordId: RECORD,
      input: { title: " La Voz ", artist: "", priceText: "80 mil", notes: "" },
      publish: false,
    });
    expect(result).toEqual({ ok: true });
    expect(repo.upsertRecord).toHaveBeenCalledWith({ id: RECORD, title: "La Voz", artist: null, priceCop: 80_000, notes: null });
    expect(repo.setStatus).not.toHaveBeenCalled();
  });

  it("saves a record with every field empty", async () => {
    expect(await saveRecord(fakeRepo(), { recordId: RECORD, input: emptyInput, publish: false })).toEqual({ ok: true });
  });

  it("makes the record available when asked to publish", async () => {
    const repo = fakeRepo();
    expect(await saveRecord(repo, { recordId: RECORD, input: emptyInput, publish: true })).toEqual({ ok: true });
    expect(repo.setStatus).toHaveBeenCalledWith(RECORD, "available");
  });

  it("says a record without photos or videos cannot be published", async () => {
    const repo = fakeRepo({ setStatus: vi.fn().mockResolvedValue({ ok: false, reason: "no_media" }) });
    expect(await saveRecord(repo, { recordId: RECORD, input: emptyInput, publish: true })).toEqual({ ok: false, reason: "no_media" });
  });

  it("reports every invalid field and saves nothing", async () => {
    const repo = fakeRepo();
    const result = await saveRecord(repo, {
      recordId: RECORD,
      input: { title: "x".repeat(201), artist: "", priceText: "barato", notes: "" },
      publish: false,
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input", errors: { title: "too_long", priceText: "invalid_price" } });
    expect(repo.upsertRecord).not.toHaveBeenCalled();
  });

  it("refuses a record id that is not a UUID", async () => {
    const repo = fakeRepo();
    expect(await saveRecord(repo, { recordId: "../../etc", input: emptyInput, publish: false })).toEqual({ ok: false, reason: "invalid_id" });
    expect(repo.currentUserId).not.toHaveBeenCalled();
  });

  it("needs a signed in user", async () => {
    const repo = fakeRepo({ currentUserId: vi.fn().mockResolvedValue(null) });
    expect(await saveRecord(repo, { recordId: RECORD, input: emptyInput, publish: false })).toEqual({ ok: false, reason: "unauthenticated" });
    expect(repo.upsertRecord).not.toHaveBeenCalled();
  });

  it("reports a failed save", async () => {
    const repo = fakeRepo({ upsertRecord: vi.fn().mockResolvedValue({ ok: false, reason: "other" }) });
    expect(await saveRecord(repo, { recordId: RECORD, input: emptyInput, publish: true })).toEqual({ ok: false, reason: "save_failed" });
    expect(repo.setStatus).not.toHaveBeenCalled();
  });

  it("reports a failure while changing the status", async () => {
    const repo = fakeRepo({ setStatus: vi.fn().mockResolvedValue({ ok: false, reason: "other" }) });
    expect(await saveRecord(repo, { recordId: RECORD, input: emptyInput, publish: true })).toEqual({ ok: false, reason: "save_failed" });
  });
});

const photoRequest = { recordId: RECORD, mediaId: MEDIA, contentType: "image/jpeg", sizeBytes: 300_000 };

describe("requestUpload", () => {
  it("gives a signed upload for a photo, in the owner's folder", async () => {
    const repo = fakeRepo();
    expect(await requestUpload(repo, photoRequest)).toEqual({
      ok: true,
      upload: {
        path: `${USER}/${RECORD}/${MEDIA}.jpg`,
        signedUrl: "https://storage.test/upload?token=abc",
        position: 0,
        kind: "photo",
        durationSeconds: null,
      },
    });
    expect(repo.createSignedUpload).toHaveBeenCalledWith(`${USER}/${RECORD}/${MEDIA}.jpg`);
  });

  it("uses the first free position", async () => {
    const repo = fakeRepo({
      listMedia: vi.fn().mockResolvedValue([{ kind: "photo", position: 0 }, { kind: "photo", position: 2 }]),
    });
    const result = await requestUpload(repo, photoRequest);
    expect(result).toMatchObject({ ok: true, upload: { position: 1 } });
  });

  it("rounds a video's duration up", async () => {
    const result = await requestUpload(fakeRepo(), { ...photoRequest, contentType: "video/mp4", sizeBytes: 9_000_000, durationSeconds: 42.1 });
    expect(result).toMatchObject({ ok: true, upload: { kind: "video", durationSeconds: 43 } });
  });

  it.each([
    [{ contentType: "image/png" }, "unsupported_type"],
    [{ sizeBytes: 6 * 1024 * 1024 }, "too_big"],
    [{ sizeBytes: 0 }, "empty"],
    [{ contentType: "video/mp4" }, "duration_unknown"],
    [{ contentType: "video/mp4", durationSeconds: 300 }, "too_long"],
  ])("refuses a file with %j", async (change, reason) => {
    const repo = fakeRepo();
    expect(await requestUpload(repo, { ...photoRequest, ...change })).toEqual({ ok: false, reason });
    expect(repo.createSignedUpload).not.toHaveBeenCalled();
  });

  it("refuses a ninth item and a third video", async () => {
    const full = Array.from({ length: 8 }, (_, position) => ({ kind: "photo", position }));
    expect(await requestUpload(fakeRepo({ listMedia: vi.fn().mockResolvedValue(full) }), photoRequest)).toEqual({ ok: false, reason: "too_many" });

    const twoVideos = [{ kind: "video", position: 0 }, { kind: "video", position: 1 }];
    const third = { ...photoRequest, contentType: "video/mp4", sizeBytes: 1_000_000, durationSeconds: 10 };
    expect(await requestUpload(fakeRepo({ listMedia: vi.fn().mockResolvedValue(twoVideos) }), third)).toEqual({ ok: false, reason: "too_many_videos" });
  });

  it("refuses ids that are not UUIDs, and needs a signed in user", async () => {
    expect(await requestUpload(fakeRepo(), { ...photoRequest, mediaId: "x" })).toEqual({ ok: false, reason: "invalid_id" });
    expect(await requestUpload(fakeRepo(), { ...photoRequest, recordId: "x" })).toEqual({ ok: false, reason: "invalid_id" });
    const anonymous = fakeRepo({ currentUserId: vi.fn().mockResolvedValue(null) });
    expect(await requestUpload(anonymous, photoRequest)).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("reports when the media cannot be listed or the upload cannot be signed", async () => {
    expect(await requestUpload(fakeRepo({ listMedia: vi.fn().mockResolvedValue(null) }), photoRequest)).toEqual({ ok: false, reason: "failed" });
    expect(await requestUpload(fakeRepo({ createSignedUpload: vi.fn().mockResolvedValue(null) }), photoRequest)).toEqual({ ok: false, reason: "failed" });
  });
});

describe("registerMedia", () => {
  it("records an uploaded file, working out path and position again on the server", async () => {
    const repo = fakeRepo({ listMedia: vi.fn().mockResolvedValue([{ kind: "photo", position: 0 }]) });
    expect(await registerMedia(repo, photoRequest)).toEqual({ ok: true, position: 1 });
    expect(repo.mediaExists).toHaveBeenCalledWith(`${USER}/${RECORD}/${MEDIA}.jpg`);
    expect(repo.insertMedia).toHaveBeenCalledWith({
      id: MEDIA,
      recordId: RECORD,
      ownerId: USER,
      path: `${USER}/${RECORD}/${MEDIA}.jpg`,
      position: 1,
      kind: "photo",
      durationSeconds: null,
    });
  });

  it("registers a video with its rounded duration", async () => {
    const repo = fakeRepo();
    await registerMedia(repo, { ...photoRequest, contentType: "video/webm", sizeBytes: 4_000_000, durationSeconds: 15.5 });
    expect(repo.insertMedia).toHaveBeenCalledWith(expect.objectContaining({ kind: "video", durationSeconds: 16 }));
  });

  it("refuses to register a file that was never uploaded", async () => {
    const repo = fakeRepo({ mediaExists: vi.fn().mockResolvedValue(false) });
    expect(await registerMedia(repo, photoRequest)).toEqual({ ok: false, reason: "not_uploaded" });
    expect(repo.insertMedia).not.toHaveBeenCalled();
  });

  it("applies the same checks as the upload request", async () => {
    expect(await registerMedia(fakeRepo(), { ...photoRequest, contentType: "image/png" })).toEqual({ ok: false, reason: "unsupported_type" });
    expect(await registerMedia(fakeRepo(), { ...photoRequest, recordId: "x" })).toEqual({ ok: false, reason: "invalid_id" });
    const anonymous = fakeRepo({ currentUserId: vi.fn().mockResolvedValue(null) });
    expect(await registerMedia(anonymous, photoRequest)).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("reports a database failure", async () => {
    const repo = fakeRepo({ insertMedia: vi.fn().mockResolvedValue({ ok: false, reason: "other" }) });
    expect(await registerMedia(repo, photoRequest)).toEqual({ ok: false, reason: "failed" });
    const limit = fakeRepo({ insertMedia: vi.fn().mockResolvedValue({ ok: false, reason: "limit" }) });
    expect(await registerMedia(limit, photoRequest)).toEqual({ ok: false, reason: "too_many" });
  });
});
