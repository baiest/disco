import { summarizeCopies, type AlbumSummary, type DiscRecord, type RecordStatus } from "@disco/domain";

export const FILTERS = ["all", "available", "sold", "no_price", "not_on_facebook"] as const;
export type InventoryFilter = (typeof FILTERS)[number];

const MAX_QUERY_LENGTH = 100;
const STATUSES: readonly string[] = ["draft", "available", "sold", "unavailable"];

export interface Search {
  query: string;
  filter: InventoryFilter;
}

type Param = string | string[] | undefined;

function first(value: Param): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Reads the search box and filter from the address. Anything unexpected falls back to "all". */
export function parseSearch(params: { q?: Param; filter?: Param }): Search {
  const filter = FILTERS.find((known) => known === first(params.filter)) ?? "all";
  return { query: first(params.q).trim().slice(0, MAX_QUERY_LENGTH), filter };
}

/** One row of `search_records`, as the database returns it. */
export interface SearchRow {
  id: string;
  title: string | null;
  artist: string | null;
  price_cop: number | null;
  status: RecordStatus;
  notes: string | null;
  sold_at: string | null;
  facebook_posted_at: string | null;
  facebook_needs_update: boolean;
  updated_at: string;
  media_count: number;
  first_media_path: string | null;
  rank: number;
  is_close_match: boolean;
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

export function isSearchRow(value: unknown): value is SearchRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row["id"] === "string" &&
    typeof row["status"] === "string" &&
    STATUSES.includes(row["status"]) &&
    ["title", "artist", "notes", "sold_at", "facebook_posted_at", "first_media_path"].every((key) =>
      nullableString(row[key]),
    ) &&
    (row["price_cop"] === null || typeof row["price_cop"] === "number") &&
    typeof row["updated_at"] === "string" &&
    typeof row["media_count"] === "number" &&
    typeof row["facebook_needs_update"] === "boolean" &&
    typeof row["is_close_match"] === "boolean"
  );
}

export function toRecord(row: SearchRow): DiscRecord {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    priceCop: row.price_cop,
    status: row.status,
    notes: row.notes,
    mediaCount: row.media_count,
    updatedAt: row.updated_at,
    deletedAt: null,
    soldAt: row.sold_at,
    facebookPostedAt: row.facebook_posted_at,
    facebookNeedsUpdate: row.facebook_needs_update,
  };
}

export interface AlbumCard {
  summary: AlbumSummary;
  /** Every copy matched only loosely (a typo), so the card says "similar to what you typed". */
  isClose: boolean;
}

/** One card per album, in the order the search ranked them. */
export function buildAlbumCards(rows: readonly SearchRow[]): AlbumCard[] {
  const closeById = new Map(rows.map((row) => [row.id, row.is_close_match]));
  return summarizeCopies(rows.map(toRecord)).map((summary) => ({
    summary,
    isClose: summary.copies.every((copy) => closeById.get(copy.id) === true),
  }));
}
