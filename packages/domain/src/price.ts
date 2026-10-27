/** Largest price that fits a Postgres integer column. */
export const MAX_PRICE_COP = 2_000_000_000;

export type ParsePriceResult = { ok: true; value: number | null } | { ok: false };

const PRICE_PATTERN = /^(\d{1,3}(?:[.,]\d{3})+|\d+)(?:\s*mil)?$/;

/**
 * Parses what a person types into a price field, in whole Colombian pesos.
 * Accepts "80000", "80.000", "$80.000" and "80 mil". Blank input means "no price".
 */
export function parsePrice(input: string): ParsePriceResult {
  const text = input.trim().toLowerCase().replace(/^\$\s*/, "");
  if (text === "") {
    return { ok: true, value: null };
  }

  const match = PRICE_PATTERN.exec(text);
  const digits = match?.[1];
  if (digits === undefined) {
    return { ok: false };
  }

  const base = Number(digits.replace(/[.,]/g, ""));
  const value = text.endsWith("mil") ? base * 1000 : base;
  return value <= MAX_PRICE_COP ? { ok: true, value } : { ok: false };
}

/** Formats whole pesos as "$80.000". */
export function formatPrice(priceCop: number): string {
  return `$${String(priceCop).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
