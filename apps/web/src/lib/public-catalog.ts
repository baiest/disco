/** One row of the public functions, as the database returns it. */
export interface PublicRow {
  id: string;
  title: string | null;
  artist: string | null;
  notes: string | null;
  status: "available" | "sold";
  price_cop: number | null;
  media_count: number;
  first_media_path: string | null;
  is_close_match: boolean;
  updated_at: string;
}

export interface PublicRecord {
  id: string;
  title: string | null;
  artist: string | null;
  notes: string | null;
  status: "available" | "sold";
  /** Present only when the owner turned the price on for this record. */
  priceCop: number | null;
  mediaCount: number;
  firstMediaPath: string | null;
  /** The match was loose (a typo), so the card says "similar to what you typed". */
  isClose: boolean;
}

const MAX_QUERY_LENGTH = 100;

function nullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

export function isPublicRow(value: unknown): value is PublicRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row["id"] === "string" &&
    // A visitor must never see anything but these two, even if the database sent it by mistake.
    (row["status"] === "available" || row["status"] === "sold") &&
    ["title", "artist", "notes", "first_media_path"].every((key) => nullableString(row[key])) &&
    (row["price_cop"] === null || typeof row["price_cop"] === "number") &&
    typeof row["media_count"] === "number" &&
    typeof row["is_close_match"] === "boolean" &&
    typeof row["updated_at"] === "string"
  );
}

export function toPublicRecord(row: PublicRow): PublicRecord {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    notes: row.notes,
    status: row.status,
    priceCop: row.price_cop,
    mediaCount: row.media_count,
    firstMediaPath: row.first_media_path,
    isClose: row.is_close_match,
  };
}

/** What the visitor typed in the search box, from the address. */
export function parsePublicQuery(params: { q?: string | string[] | undefined }): string {
  const value = Array.isArray(params.q) ? params.q[0] : params.q;
  return (value ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

const MIN_PHONE_DIGITS = 8;
const MAX_PHONE_DIGITS = 15;

/** A WhatsApp chat link with the message ready, or null when the shop's number is missing or not a number. */
export function whatsappHref(rawNumber: string | undefined, message: string): string | null {
  const digits = (rawNumber ?? "").replace(/\D/g, "");
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    return null;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
