import type { DiscRecord } from "./types";

export function makeRecord(overrides: Partial<DiscRecord> = {}): DiscRecord {
  return {
    id: "rec-1",
    title: null,
    artist: null,
    priceCop: null,
    status: "draft",
    notes: null,
    mediaCount: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    soldAt: null,
    facebookPostedAt: null,
    facebookNeedsUpdate: false,
    ...overrides,
  };
}
