import { describe, expect, it } from "vitest";
import { normalizeText } from "./normalize";

describe("normalizeText", () => {
  it.each([
    ["Héctor Lavoe", "hector lavoe"],
    ["Rubén Blades", "ruben blades"],
    ["Muñoz", "munoz"],
    ["  Ritmo   de  Santo!  ", "ritmo de santo"],
    ["LP 33 1/3", "lp 33 1 3"],
    ["Candita Batista y sus Tambores Batá", "candita batista y sus tambores bata"],
  ])("turns %j into %j", (input, expected) => {
    expect(normalizeText(input)).toBe(expected);
  });

  it.each([null, undefined, "", "   ", "---"])("turns %j into an empty string", (input) => {
    expect(normalizeText(input)).toBe("");
  });

  it("gives the same text for the same words written differently", () => {
    expect(normalizeText("HÉCTOR  lavoe")).toBe(normalizeText("hector Lavoe"));
  });
});
