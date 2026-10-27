import { describe, expect, it } from "vitest";
import { summarizeCopies } from "./copies";
import { makeRecord } from "./test-helpers";

describe("summarizeCopies", () => {
  it("groups copies of the same album, ignoring case, accents and spacing", () => {
    const groups = summarizeCopies([
      makeRecord({ id: "a", title: "La Voz", artist: "Héctor Lavoe", status: "available" }),
      makeRecord({ id: "b", title: "la  voz", artist: "Hector Lavoe", status: "sold" }),
      makeRecord({ id: "c", title: "Cosa Nuestra", artist: "Willie Colón", status: "available" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.copies.map((copy) => copy.id)).toEqual(["a", "b"]);
    expect(groups[1]?.copies.map((copy) => copy.id)).toEqual(["c"]);
  });

  it("keeps the first record's wording as the group's title and artist", () => {
    const [group] = summarizeCopies([
      makeRecord({ id: "a", title: "La Voz", artist: "Héctor Lavoe" }),
      makeRecord({ id: "b", title: "LA VOZ", artist: "hector lavoe" }),
    ]);
    expect(group).toMatchObject({ title: "La Voz", artist: "Héctor Lavoe" });
  });

  it("does not mix albums by different artists with the same title", () => {
    const groups = summarizeCopies([
      makeRecord({ id: "a", title: "Salsa", artist: "Uno" }),
      makeRecord({ id: "b", title: "Salsa", artist: "Otro" }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("never groups records without a title: each one stands alone", () => {
    const groups = summarizeCopies([
      makeRecord({ id: "a", title: null, artist: "Fania All Stars" }),
      makeRecord({ id: "b", title: null, artist: "Fania All Stars" }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("counts copies by status", () => {
    const [group] = summarizeCopies([
      makeRecord({ id: "a", title: "X", status: "available" }),
      makeRecord({ id: "b", title: "X", status: "available" }),
      makeRecord({ id: "c", title: "X", status: "sold" }),
      makeRecord({ id: "d", title: "X", status: "unavailable" }),
      makeRecord({ id: "e", title: "X", status: "draft" }),
    ]);
    expect(group).toMatchObject({ available: 2, sold: 1, unavailable: 1, drafts: 1 });
  });

  it("reports the most recent sale date", () => {
    const [group] = summarizeCopies([
      makeRecord({ id: "a", title: "X", status: "sold", soldAt: "2026-10-12T10:00:00.000Z" }),
      makeRecord({ id: "b", title: "X", status: "sold", soldAt: "2026-10-20T10:00:00.000Z" }),
      makeRecord({ id: "c", title: "X", status: "available" }),
    ]);
    expect(group?.lastSoldAt).toBe("2026-10-20T10:00:00.000Z");
  });

  it("has no sale date when nothing was sold", () => {
    const [group] = summarizeCopies([makeRecord({ title: "X", status: "available" })]);
    expect(group?.lastSoldAt).toBeNull();
  });

  it.each([
    [["available", "sold"], "in_stock"],
    [["available"], "in_stock"],
    [["sold", "sold"], "sold_out"],
    [["sold", "unavailable"], "sold_out"],
    [["unavailable"], "unavailable_only"],
    [["unavailable", "draft"], "unavailable_only"],
    [["draft"], "draft_only"],
  ] as const)("answers %j with %s", (statuses, expected) => {
    const [group] = summarizeCopies(
      statuses.map((status, index) => makeRecord({ id: String(index), title: "X", status })),
    );
    expect(group?.stock).toBe(expected);
  });

  it("leaves out deleted records", () => {
    const groups = summarizeCopies([
      makeRecord({ id: "a", title: "X", deletedAt: "2026-10-01T00:00:00.000Z" }),
      makeRecord({ id: "b", title: "Y" }),
    ]);
    expect(groups.map((group) => group.title)).toEqual(["Y"]);
  });

  it("keeps the order in which albums first appear", () => {
    const groups = summarizeCopies([
      makeRecord({ id: "a", title: "B" }),
      makeRecord({ id: "b", title: "A" }),
      makeRecord({ id: "c", title: "B" }),
    ]);
    expect(groups.map((group) => group.title)).toEqual(["B", "A"]);
  });

  it("returns nothing for no records", () => {
    expect(summarizeCopies([])).toEqual([]);
  });
});
