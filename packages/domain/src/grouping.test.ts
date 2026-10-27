import { describe, expect, it } from "vitest";
import { groupRecords } from "./grouping";
import { makeRecord } from "./test-helpers";

describe("groupRecords", () => {
  it("splits drafts from published records", () => {
    const records = [
      makeRecord({ id: "a", status: "draft" }),
      makeRecord({ id: "b", status: "available" }),
      makeRecord({ id: "c", status: "sold" }),
      makeRecord({ id: "d", status: "unavailable" }),
    ];
    const { drafts, published } = groupRecords(records);
    expect(drafts.map((r) => r.id)).toEqual(["a"]);
    expect(published.map((r) => r.id).sort()).toEqual(["b", "c", "d"]);
  });

  it("sorts each group by most recently updated first", () => {
    const records = [
      makeRecord({ id: "old", status: "draft", updatedAt: "2026-01-01T00:00:00.000Z" }),
      makeRecord({ id: "new", status: "draft", updatedAt: "2026-03-01T00:00:00.000Z" }),
      makeRecord({ id: "mid", status: "draft", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ];
    expect(groupRecords(records).drafts.map((r) => r.id)).toEqual(["new", "mid", "old"]);
  });

  it("leaves out deleted records", () => {
    const records = [
      makeRecord({ id: "live", status: "draft" }),
      makeRecord({ id: "gone", status: "draft", deletedAt: "2026-02-01T00:00:00.000Z" }),
    ];
    expect(groupRecords(records).drafts.map((r) => r.id)).toEqual(["live"]);
  });

  it("returns empty groups for no records", () => {
    expect(groupRecords([])).toEqual({ drafts: [], published: [] });
  });
});
