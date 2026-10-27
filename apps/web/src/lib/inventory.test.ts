import { describe, expect, it } from "vitest";
import { buildAlbumCards, isSearchRow, parseSearch, toRecord, type SearchRow } from "./inventory";

function row(overrides: Partial<SearchRow> = {}): SearchRow {
  return {
    id: "r1",
    title: "Ritmo de Santo",
    artist: "Candita",
    price_cop: null,
    status: "available",
    notes: null,
    sold_at: null,
    facebook_posted_at: null,
    facebook_needs_update: false,
    updated_at: "2026-10-01T00:00:00Z",
    media_count: 2,
    first_media_path: "o/r1/m1.jpg",
    rank: 0,
    is_close_match: false,
    ...overrides,
  };
}

describe("parseSearch", () => {
  it("trims the text and defaults the filter to all", () => {
    expect(parseSearch({ q: "  ritmo  " })).toEqual({ query: "ritmo", filter: "all" });
    expect(parseSearch({})).toEqual({ query: "", filter: "all" });
  });

  it("accepts the known filters only", () => {
    expect(parseSearch({ filter: "sold" }).filter).toBe("sold");
    expect(parseSearch({ filter: "no_price" }).filter).toBe("no_price");
    expect(parseSearch({ filter: "not_on_facebook" }).filter).toBe("not_on_facebook");
    expect(parseSearch({ filter: "drop table" }).filter).toBe("all");
  });

  it("takes the first value when a parameter repeats and caps the length", () => {
    expect(parseSearch({ q: ["a", "b"] }).query).toBe("a");
    expect(parseSearch({ q: "x".repeat(500) }).query).toHaveLength(100);
  });
});

describe("isSearchRow", () => {
  it("accepts what the database returns and rejects anything else", () => {
    expect(isSearchRow(row())).toBe(true);
    expect(isSearchRow({ ...row(), status: "weird" })).toBe(false);
    expect(isSearchRow({ ...row(), media_count: "2" })).toBe(false);
    expect(isSearchRow(null)).toBe(false);
    expect(isSearchRow("row")).toBe(false);
  });
});

describe("toRecord", () => {
  it("maps the database row to a record", () => {
    expect(toRecord(row({ price_cop: 80000, sold_at: "2026-10-12T00:00:00Z" }))).toEqual({
      id: "r1",
      title: "Ritmo de Santo",
      artist: "Candita",
      priceCop: 80000,
      status: "available",
      notes: null,
      mediaCount: 2,
      updatedAt: "2026-10-01T00:00:00Z",
      deletedAt: null,
      soldAt: "2026-10-12T00:00:00Z",
      facebookPostedAt: null,
      facebookNeedsUpdate: false,
    });
  });
});

describe("buildAlbumCards", () => {
  it("puts copies of the same album on one card and counts them", () => {
    const cards = buildAlbumCards([
      row({ id: "a" }),
      row({ id: "b", status: "sold", sold_at: "2026-10-12T00:00:00Z" }),
      row({ id: "c", title: "Otro", artist: "Alguien" }),
    ]);
    expect(cards).toHaveLength(2);
    expect(cards[0]?.summary).toMatchObject({ available: 1, sold: 1, stock: "in_stock" });
    expect(cards[0]?.summary.copies.map((copy) => copy.id)).toEqual(["a", "b"]);
  });

  it("marks a card as close only when every copy is a loose match", () => {
    const loose = buildAlbumCards([row({ id: "a", is_close_match: true }), row({ id: "b", is_close_match: true })]);
    expect(loose[0]?.isClose).toBe(true);
    const mixed = buildAlbumCards([row({ id: "a", is_close_match: true }), row({ id: "b", is_close_match: false })]);
    expect(mixed[0]?.isClose).toBe(false);
  });

  it("keeps the order the database gave", () => {
    const cards = buildAlbumCards([row({ id: "x", title: "Z" }), row({ id: "y", title: "A" })]);
    expect(cards.map((card) => card.summary.title)).toEqual(["Z", "A"]);
  });

  it("returns nothing for no rows", () => {
    expect(buildAlbumCards([])).toEqual([]);
  });
});
