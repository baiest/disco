import type { DiscRecord } from "@disco/domain";
import { describe, expect, it, vi } from "vitest";
import {
  changeRecordStatus,
  undoRecordStatus,
  updateRecordFields,
  type DetailRepo,
} from "./record-detail";

const ID = "3f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f";

function record(overrides: Partial<DiscRecord> = {}): DiscRecord {
  return {
    id: ID,
    title: "Ritmo",
    artist: null,
    priceCop: null,
    status: "available",
    notes: null,
    mediaCount: 1,
    updatedAt: "2026-10-01T00:00:00Z",
    deletedAt: null,
    soldAt: null,
    facebookPostedAt: null,
    facebookNeedsUpdate: false,
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<DetailRepo> = {}): DetailRepo {
  return {
    currentUserId: vi.fn().mockResolvedValue("u1"),
    getRecord: vi.fn().mockResolvedValue(record()),
    updateFields: vi.fn().mockResolvedValue({ ok: true }),
    setStatus: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
}

describe("changeRecordStatus", () => {
  it("changes the status and returns the one to go back to", async () => {
    const repo = fakeRepo();
    const result = await changeRecordStatus(repo, { recordId: ID, status: "sold" });
    expect(result).toEqual({ ok: true, previousStatus: "available" });
    expect(repo.setStatus).toHaveBeenCalledWith(ID, "sold");
  });

  it("refuses a bad id or no session without touching the database", async () => {
    const repo = fakeRepo();
    expect(await changeRecordStatus(repo, { recordId: "nope", status: "sold" })).toEqual({ ok: false, reason: "invalid_id" });
    const signedOut = fakeRepo({ currentUserId: vi.fn().mockResolvedValue(null) });
    expect(await changeRecordStatus(signedOut, { recordId: ID, status: "sold" })).toEqual({ ok: false, reason: "unauthenticated" });
    expect(repo.setStatus).not.toHaveBeenCalled();
    expect(signedOut.setStatus).not.toHaveBeenCalled();
  });

  it("reports a record that is not there", async () => {
    const repo = fakeRepo({ getRecord: vi.fn().mockResolvedValue(null) });
    expect(await changeRecordStatus(repo, { recordId: ID, status: "sold" })).toEqual({ ok: false, reason: "not_found" });
  });

  it("applies the domain rules: a draft needs a photo, and the same status is refused", async () => {
    const draft = fakeRepo({ getRecord: vi.fn().mockResolvedValue(record({ status: "draft", mediaCount: 0 })) });
    expect(await changeRecordStatus(draft, { recordId: ID, status: "available" })).toEqual({ ok: false, reason: "no_media" });
    expect(await changeRecordStatus(fakeRepo(), { recordId: ID, status: "available" })).toEqual({ ok: false, reason: "same_status" });
    expect(draft.setStatus).not.toHaveBeenCalled();
  });

  it("does not offer a draft as a target", async () => {
    expect(await changeRecordStatus(fakeRepo(), { recordId: ID, status: "draft" })).toEqual({ ok: false, reason: "invalid_status" });
    expect(await changeRecordStatus(fakeRepo(), { recordId: ID, status: "banana" })).toEqual({ ok: false, reason: "invalid_status" });
  });

  it("maps database failures", async () => {
    const noMedia = fakeRepo({ setStatus: vi.fn().mockResolvedValue({ ok: false, reason: "no_media" }) });
    expect(await changeRecordStatus(noMedia, { recordId: ID, status: "sold" })).toEqual({ ok: false, reason: "no_media" });
    const other = fakeRepo({ setStatus: vi.fn().mockResolvedValue({ ok: false, reason: "other" }) });
    expect(await changeRecordStatus(other, { recordId: ID, status: "sold" })).toEqual({ ok: false, reason: "failed" });
  });
});

describe("undoRecordStatus", () => {
  it("puts the previous status back", async () => {
    const repo = fakeRepo({ getRecord: vi.fn().mockResolvedValue(record({ status: "sold" })) });
    expect(await undoRecordStatus(repo, { recordId: ID, previousStatus: "available" })).toEqual({ ok: true });
    expect(repo.setStatus).toHaveBeenCalledWith(ID, "available");
  });

  it("only goes back to a published status or draft the record can have", async () => {
    const repo = fakeRepo();
    expect(await undoRecordStatus(repo, { recordId: ID, previousStatus: "banana" })).toEqual({ ok: false, reason: "invalid_status" });
    expect(repo.setStatus).not.toHaveBeenCalled();
  });

  it("can go back to draft when that is where it came from", async () => {
    const repo = fakeRepo();
    expect(await undoRecordStatus(repo, { recordId: ID, previousStatus: "draft" })).toEqual({ ok: true });
    expect(repo.setStatus).toHaveBeenCalledWith(ID, "draft");
  });

  it("refuses without a session", async () => {
    const repo = fakeRepo({ currentUserId: vi.fn().mockResolvedValue(null) });
    expect(await undoRecordStatus(repo, { recordId: ID, previousStatus: "available" })).toEqual({ ok: false, reason: "unauthenticated" });
  });
});

describe("updateRecordFields", () => {
  const input = { title: " Ritmo ", artist: "", priceText: "80 mil", notes: "" };

  it("saves the cleaned values", async () => {
    const repo = fakeRepo();
    expect(await updateRecordFields(repo, { recordId: ID, input })).toEqual({ ok: true });
    expect(repo.updateFields).toHaveBeenCalledWith(ID, { title: "Ritmo", artist: null, priceCop: 80000, notes: null });
  });

  it("reports what is wrong with the input and saves nothing", async () => {
    const repo = fakeRepo();
    const result = await updateRecordFields(repo, { recordId: ID, input: { ...input, priceText: "abc" } });
    expect(result).toEqual({ ok: false, reason: "invalid_input", errors: { priceText: "invalid_price" } });
    expect(repo.updateFields).not.toHaveBeenCalled();
  });

  it("refuses a bad id, no session, and database failures", async () => {
    expect(await updateRecordFields(fakeRepo(), { recordId: "x", input })).toEqual({ ok: false, reason: "invalid_id" });
    const signedOut = fakeRepo({ currentUserId: vi.fn().mockResolvedValue(null) });
    expect(await updateRecordFields(signedOut, { recordId: ID, input })).toEqual({ ok: false, reason: "unauthenticated" });
    const failing = fakeRepo({ updateFields: vi.fn().mockResolvedValue({ ok: false, reason: "other" }) });
    expect(await updateRecordFields(failing, { recordId: ID, input })).toEqual({ ok: false, reason: "failed" });
  });
});
