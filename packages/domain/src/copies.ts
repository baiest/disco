import { normalizeText } from "./normalize";
import type { DiscRecord } from "./types";

/** What the owner needs to know about an album: do I have it, did I sell it? */
export type StockState = "in_stock" | "sold_out" | "unavailable_only" | "draft_only";

export interface AlbumSummary {
  key: string;
  title: string | null;
  artist: string | null;
  copies: DiscRecord[];
  available: number;
  sold: number;
  unavailable: number;
  drafts: number;
  lastSoldAt: string | null;
  stock: StockState;
}

/** Records with no title cannot be told apart, so each one is its own album. */
function albumKey(record: DiscRecord): string {
  const title = normalizeText(record.title);
  return title === "" ? `record:${record.id}` : `${title}|${normalizeText(record.artist)}`;
}

function stockState(available: number, sold: number, unavailable: number): StockState {
  if (available > 0) {
    return "in_stock";
  }
  if (sold > 0) {
    return "sold_out";
  }
  return unavailable > 0 ? "unavailable_only" : "draft_only";
}

function latest(dates: (string | null)[]): string | null {
  return dates.reduce<string | null>((best, date) => (date !== null && (best === null || date > best) ? date : best), null);
}

/** Groups copies of the same album and counts them, keeping the order albums first appear in. */
export function summarizeCopies(records: readonly DiscRecord[]): AlbumSummary[] {
  const groups = new Map<string, DiscRecord[]>();
  for (const record of records) {
    if (record.deletedAt !== null) {
      continue;
    }
    const key = albumKey(record);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  return [...groups].map(([key, copies]) => {
    const count = (status: DiscRecord["status"]) => copies.filter((copy) => copy.status === status).length;
    const [first] = copies;
    const available = count("available");
    const sold = count("sold");
    const unavailable = count("unavailable");
    return {
      key,
      title: first?.title ?? null,
      artist: first?.artist ?? null,
      copies,
      available,
      sold,
      unavailable,
      drafts: count("draft"),
      lastSoldAt: latest(copies.map((copy) => copy.soldAt)),
      stock: stockState(available, sold, unavailable),
    };
  });
}
