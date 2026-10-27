import { describe, expect, it } from "vitest";
import { normalizeRecordInput } from "./record-input";

const empty = { title: "", artist: "", priceText: "", notes: "" };

describe("normalizeRecordInput", () => {
  it("accepts a form with everything empty", () => {
    expect(normalizeRecordInput(empty)).toEqual({
      ok: true,
      value: { title: null, artist: null, priceCop: null, notes: null },
    });
  });

  it("trims text and turns blanks into null", () => {
    expect(normalizeRecordInput({ title: "  La Voz ", artist: "   ", priceText: "", notes: " LP original\n" })).toEqual({
      ok: true,
      value: { title: "La Voz", artist: null, priceCop: null, notes: "LP original" },
    });
  });

  it("parses the price the way people write it", () => {
    for (const [text, price] of [["80.000", 80_000], ["$80.000", 80_000], ["80 mil", 80_000], ["80000", 80_000]] as const) {
      expect(normalizeRecordInput({ ...empty, priceText: text })).toMatchObject({ ok: true, value: { priceCop: price } });
    }
  });

  it("reports a price it cannot read", () => {
    expect(normalizeRecordInput({ ...empty, priceText: "barato" })).toEqual({
      ok: false,
      errors: { priceText: "invalid_price" },
    });
  });

  it("limits the length of each text", () => {
    expect(normalizeRecordInput({ ...empty, title: "x".repeat(201) })).toEqual({ ok: false, errors: { title: "too_long" } });
    expect(normalizeRecordInput({ ...empty, artist: "x".repeat(201) })).toEqual({ ok: false, errors: { artist: "too_long" } });
    expect(normalizeRecordInput({ ...empty, notes: "x".repeat(2001) })).toEqual({ ok: false, errors: { notes: "too_long" } });
    expect(normalizeRecordInput({ ...empty, title: "x".repeat(200), notes: "x".repeat(2000) })).toMatchObject({ ok: true });
  });

  it("reports every problem at once", () => {
    expect(normalizeRecordInput({ title: "x".repeat(201), artist: "", priceText: "??", notes: "" })).toEqual({
      ok: false,
      errors: { title: "too_long", priceText: "invalid_price" },
    });
  });
});
