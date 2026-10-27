import { parsePrice } from "./price";

export interface RecordInput {
  title: string;
  artist: string;
  priceText: string;
  notes: string;
}

export interface RecordValues {
  title: string | null;
  artist: string | null;
  priceCop: number | null;
  notes: string | null;
}

export type RecordInputField = keyof RecordInput;
export type RecordInputError = "too_long" | "invalid_price";

export type RecordInputResult =
  | { ok: true; value: RecordValues }
  | { ok: false; errors: Partial<Record<RecordInputField, RecordInputError>> };

const MAX_LENGTH = { title: 200, artist: 200, notes: 2000 } as const;

function clean(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

/** Turns what was typed in the form into the values to store. Every field is optional. */
export function normalizeRecordInput(input: RecordInput): RecordInputResult {
  const errors: Partial<Record<RecordInputField, RecordInputError>> = {};

  const title = clean(input.title);
  const artist = clean(input.artist);
  const notes = clean(input.notes);
  for (const [field, value] of [["title", title], ["artist", artist], ["notes", notes]] as const) {
    if (value !== null && value.length > MAX_LENGTH[field]) {
      errors[field] = "too_long";
    }
  }

  const price = parsePrice(input.priceText);
  if (!price.ok) {
    errors.priceText = "invalid_price";
  }

  if (Object.keys(errors).length > 0 || !price.ok) {
    return { ok: false, errors };
  }
  return { ok: true, value: { title, artist, priceCop: price.value, notes } };
}
