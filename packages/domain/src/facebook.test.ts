import { describe, expect, it } from "vitest";
import { buildFacebookPost } from "./facebook";
import { makeRecord } from "./test-helpers";

const labels = { available: "DISPONIBLE", sold: "VENDIDO" };

describe("buildFacebookPost", () => {
  it("writes the title in quotes and capitals, then the notes, then availability", () => {
    const text = buildFacebookPost(
      makeRecord({ title: "Ritmo de Santo", notes: "LP original americano", status: "available" }),
      labels,
    );
    expect(text).toBe('"RITMO DE SANTO"\nLP ORIGINAL AMERICANO\nDISPONIBLE');
  });

  it("works with only a title", () => {
    expect(buildFacebookPost(makeRecord({ title: "La Voz", status: "available" }), labels)).toBe(
      '"LA VOZ"\nDISPONIBLE',
    );
  });

  it("works with no title, using the notes", () => {
    expect(buildFacebookPost(makeRecord({ notes: "Lote de salsa", status: "available" }), labels)).toBe(
      "LOTE DE SALSA\nDISPONIBLE",
    );
  });

  it("keeps every line of the notes and drops blank ones", () => {
    const text = buildFacebookPost(
      makeRecord({ title: "X", notes: "  uno \n\n dos  ", status: "available" }),
      labels,
    );
    expect(text).toBe('"X"\nUNO\nDOS\nDISPONIBLE');
  });

  it("does not double the quotes a title already has", () => {
    expect(buildFacebookPost(makeRecord({ title: '"Contoneo Meneo"', status: "available" }), labels)).toBe(
      '"CONTONEO MENEO"\nDISPONIBLE',
    );
  });

  it("uses Spanish capitals for accented letters", () => {
    expect(buildFacebookPost(makeRecord({ title: "Cañón", status: "available" }), labels)).toBe('"CAÑÓN"\nDISPONIBLE');
  });

  it("marks a sold record as sold", () => {
    expect(buildFacebookPost(makeRecord({ title: "X", status: "sold" }), labels)).toBe('"X"\nVENDIDO');
  });

  it.each(["draft", "unavailable"] as const)("adds no availability line for %s", (status) => {
    expect(buildFacebookPost(makeRecord({ title: "X", status }), labels)).toBe('"X"');
  });

  it("never writes the price, the artist or internal data", () => {
    const text = buildFacebookPost(
      makeRecord({ title: "X", artist: "Alguien", priceCop: 80_000, status: "available" }),
      labels,
    );
    expect(text).not.toMatch(/80|ALGUIEN/);
  });

  it("returns an empty text for a record with nothing to say", () => {
    expect(buildFacebookPost(makeRecord({ status: "draft" }), labels)).toBe("");
  });

  it("stays fast on a title made of thousands of quotes", () => {
    const hostile = `${'"'.repeat(20_000)}x${'"'.repeat(20_000)}y`;
    const started = performance.now();
    const text = buildFacebookPost(makeRecord({ title: hostile, status: "available" }), labels);
    expect(performance.now() - started).toBeLessThan(200);
    expect(text).toContain("X");
  });

  it("strips mixed straight and curly quotes at both ends only", () => {
    expect(buildFacebookPost(makeRecord({ title: '\u201C"Ritmo "de" Santo"\u201D', status: "draft" }), labels)).toBe(
      '"RITMO "DE" SANTO"',
    );
  });
});
