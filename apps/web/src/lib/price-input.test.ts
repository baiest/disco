import { describe, expect, it } from "vitest";
import { formatPriceInput } from "./price-input";

const dots = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

describe("formatPriceInput", () => {
  it.each([
    ["", ""],
    ["   ", ""],
    ["8", "8"],
    ["80", "80"],
    ["1500", "1.500"],
    ["80000", "80.000"],
    ["1200000", "1.200.000"],
  ])("groups the digits of %j as %j", (typed, shown) => {
    expect(formatPriceInput(typed, dots)).toBe(shown);
  });

  it("reformats what is already grouped as more digits are typed", () => {
    expect(formatPriceInput("80.0000", dots)).toBe("800.000");
    expect(formatPriceInput("8.000", dots)).toBe("8.000");
  });

  it("takes out the separators, the dollar sign and the spaces the keyboard may add", () => {
    expect(formatPriceInput("$ 80 000", dots)).toBe("80.000");
    expect(formatPriceInput("80,000", dots)).toBe("80.000");
  });

  it("drops leading zeros", () => {
    expect(formatPriceInput("0080", dots)).toBe("80");
    expect(formatPriceInput("000", dots)).toBe("0");
  });

  it("leaves text with letters alone, so '80 mil' still works", () => {
    expect(formatPriceInput("80 mil", dots)).toBe("80 mil");
    expect(formatPriceInput("8abc", dots)).toBe("8abc");
  });

  it("never goes above the largest price the database accepts", () => {
    expect(formatPriceInput("2000000000", dots)).toBe("2.000.000.000");
    expect(formatPriceInput("20000000001", dots)).toBe("2.000.000.000");
    expect(formatPriceInput("99999999999999", dots)).toBe("999.999.999");
  });

  it("uses whatever grouping the formatter gives, for another language", () => {
    expect(formatPriceInput("80000", (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","))).toBe("80,000");
  });
});
