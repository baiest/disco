import { MAX_PRICE_COP } from "@disco/domain";

/**
 * Formats a price field as it is typed: "80000" becomes "80.000". `group` says how the language writes
 * a number. Text with letters ("80 mil") is left alone, because the price parser understands it.
 */
export function formatPriceInput(typed: string, group: (value: number) => string): string {
  if (/[^\d.,\s$]/.test(typed)) {
    return typed;
  }
  let digits = typed.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (digits === "") {
    return "";
  }
  // One digit at a time off the end until it fits, so a long paste still gives a valid price.
  while (Number(digits) > MAX_PRICE_COP) {
    digits = digits.slice(0, -1);
  }
  return group(Number(digits));
}
