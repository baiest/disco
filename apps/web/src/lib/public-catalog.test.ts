import { describe, expect, it } from "vitest";
import {
  isPublicRow,
  parsePublicQuery,
  toPublicRecord,
  whatsappHref,
  type PublicRow,
} from "./public-catalog";

function row(overrides: Partial<PublicRow> = {}): PublicRow {
  return {
    id: "r1",
    title: "Ritmo de Santo",
    artist: "Candita",
    notes: "LP original",
    status: "available",
    price_cop: null,
    media_count: 2,
    first_media_path: "o/r1/m1.jpg",
    is_close_match: false,
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

describe("isPublicRow", () => {
  it("accepts what the database returns", () => {
    expect(isPublicRow(row())).toBe(true);
    expect(isPublicRow(row({ status: "sold", price_cop: 80_000, title: null, notes: null, first_media_path: null }))).toBe(true);
  });

  it("rejects anything else, including a status a visitor must never get", () => {
    expect(isPublicRow(row({ status: "draft" as never }))).toBe(false);
    expect(isPublicRow(row({ status: "unavailable" as never }))).toBe(false);
    expect(isPublicRow({ ...row(), media_count: "2" })).toBe(false);
    expect(isPublicRow({ ...row(), price_cop: "80" })).toBe(false);
    expect(isPublicRow(null)).toBe(false);
    expect(isPublicRow("row")).toBe(false);
  });
});

describe("toPublicRecord", () => {
  it("renames the columns and keeps the price only when there is one", () => {
    expect(toPublicRecord(row({ price_cop: 80_000 }))).toEqual({
      id: "r1",
      title: "Ritmo de Santo",
      artist: "Candita",
      notes: "LP original",
      status: "available",
      priceCop: 80_000,
      mediaCount: 2,
      firstMediaPath: "o/r1/m1.jpg",
      isClose: false,
    });
    expect(toPublicRecord(row()).priceCop).toBeNull();
  });
});

describe("parsePublicQuery", () => {
  it("trims the text, takes the first of a repeated parameter and caps the length", () => {
    expect(parsePublicQuery({ q: "  ritmo " })).toBe("ritmo");
    expect(parsePublicQuery({ q: ["a", "b"] })).toBe("a");
    expect(parsePublicQuery({ q: "x".repeat(500) })).toHaveLength(100);
    expect(parsePublicQuery({})).toBe("");
  });
});

describe("whatsappHref", () => {
  it("builds a chat link with the message ready", () => {
    expect(whatsappHref("+57 300 123 4567", "¿Está disponible «La Voz»?")).toBe(
      `https://wa.me/573001234567?text=${encodeURIComponent("¿Está disponible «La Voz»?")}`,
    );
  });

  it("keeps only the digits of the number", () => {
    expect(whatsappHref("(57) 300-123-4567", "hola")).toBe("https://wa.me/573001234567?text=hola");
  });

  it.each([undefined, "", "   ", "abc", "123", "1".repeat(16)])("gives no link for the number %j", (number) => {
    expect(whatsappHref(number, "hola")).toBeNull();
  });

  it("writes the message safely in the address", () => {
    expect(whatsappHref("573001234567", "a&b=c d")).toBe("https://wa.me/573001234567?text=a%26b%3Dc%20d");
  });
});
