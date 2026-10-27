import { describe, expect, it } from "vitest";
import { changeStatus, undoStatusChange } from "./status";
import { makeRecord } from "./test-helpers";

describe("changeStatus", () => {
  it("publishes a draft that has a photo", () => {
    const result = changeStatus(makeRecord({ status: "draft", photoCount: 1 }), "available");
    expect(result).toMatchObject({ ok: true, record: { status: "available" } });
  });

  it("refuses to publish a draft without photos", () => {
    const result = changeStatus(makeRecord({ status: "draft", photoCount: 0 }), "available");
    expect(result).toEqual({ ok: false, reason: "no_photo" });
  });

  it("does not let a draft jump straight to sold or unavailable", () => {
    const record = makeRecord({ status: "draft", photoCount: 1 });
    expect(changeStatus(record, "sold")).toEqual({ ok: false, reason: "publish_first" });
    expect(changeStatus(record, "unavailable")).toEqual({ ok: false, reason: "publish_first" });
  });

  it("moves a published record between available, sold and unavailable", () => {
    const record = makeRecord({ status: "available", photoCount: 1 });
    expect(changeStatus(record, "sold")).toMatchObject({ ok: true, record: { status: "sold" } });
    expect(changeStatus(record, "unavailable")).toMatchObject({
      ok: true,
      record: { status: "unavailable" },
    });
  });

  it("lets a published record go back to draft", () => {
    const record = makeRecord({ status: "sold", photoCount: 1 });
    expect(changeStatus(record, "draft")).toMatchObject({ ok: true, record: { status: "draft" } });
  });

  it("rejects a change to the same status", () => {
    const record = makeRecord({ status: "available", photoCount: 1 });
    expect(changeStatus(record, "available")).toEqual({ ok: false, reason: "same_status" });
  });

  it("returns an undo that restores the previous status", () => {
    const record = makeRecord({ status: "available", photoCount: 1 });
    const result = changeStatus(record, "sold");
    if (!result.ok) throw new Error("expected ok");
    expect(result.undo).toEqual({ recordId: "rec-1", previousStatus: "available" });
    expect(undoStatusChange(result.record, result.undo).status).toBe("available");
  });

  it("does not mutate the input record", () => {
    const record = makeRecord({ status: "available", photoCount: 1 });
    changeStatus(record, "sold");
    expect(record.status).toBe("available");
  });
});

describe("undoStatusChange", () => {
  it("ignores an undo meant for a different record", () => {
    const record = makeRecord({ id: "rec-2", status: "sold" });
    const result = undoStatusChange(record, { recordId: "rec-1", previousStatus: "available" });
    expect(result).toBe(record);
  });
});
