import { describe, expect, it } from "vitest";
import { formatPrice, parsePrice } from "./price";

describe("parsePrice", () => {
  it.each([
    ["80000", 80000],
    ["80.000", 80000],
    ["80,000", 80000],
    ["$80.000", 80000],
    ["  1.250.000 ", 1250000],
    ["80 mil", 80000],
    ["80mil", 80000],
    ["80 MIL", 80000],
    ["0", 0],
  ])("parses %j as %i", (input, value) => {
    expect(parsePrice(input)).toEqual({ ok: true, value });
  });

  it.each(["", "   "])("treats blank input %j as no price", (input) => {
    expect(parsePrice(input)).toEqual({ ok: true, value: null });
  });

  it.each(["abc", "-5", "80.5", "8.00", "12 pesos", "80 mil mil", "1..000", "2.000.000.001", "3000000 mil"])(
    "rejects %j",
    (input) => {
      expect(parsePrice(input)).toEqual({ ok: false });
    },
  );
});

describe("formatPrice", () => {
  it.each([
    [0, "$0"],
    [500, "$500"],
    [80000, "$80.000"],
    [1250000, "$1.250.000"],
  ])("formats %i as %s", (value, text) => {
    expect(formatPrice(value)).toBe(text);
  });
});
