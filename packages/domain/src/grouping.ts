import type { DiscRecord } from "./types";

export interface GroupedRecords {
  drafts: DiscRecord[];
  published: DiscRecord[];
}

/** Splits live records into drafts and published ones, most recently updated first. */
export function groupRecords(records: readonly DiscRecord[]): GroupedRecords {
  const live = records
    .filter((record) => record.deletedAt === null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return {
    drafts: live.filter((record) => record.status === "draft"),
    published: live.filter((record) => record.status !== "draft"),
  };
}
