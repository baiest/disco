import { canPublish } from "./publish";
import type { DiscRecord, RecordStatus } from "./types";

export interface StatusUndo {
  recordId: string;
  previousStatus: RecordStatus;
}

export type StatusFailure = "no_media" | "publish_first" | "same_status";

export type ChangeStatusResult =
  | { ok: true; record: DiscRecord; undo: StatusUndo }
  | { ok: false; reason: StatusFailure };

/**
 * Moves a record to a new status. A draft can only be published (needs a photo);
 * published records move freely between available, sold, unavailable and draft.
 */
export function changeStatus(record: DiscRecord, next: RecordStatus): ChangeStatusResult {
  if (record.status === next) {
    return { ok: false, reason: "same_status" };
  }

  if (record.status === "draft") {
    if (next !== "available") {
      return { ok: false, reason: "publish_first" };
    }
    const publishable = canPublish(record);
    if (!publishable.ok) {
      return publishable;
    }
  }

  return {
    ok: true,
    record: { ...record, status: next },
    undo: { recordId: record.id, previousStatus: record.status },
  };
}

/** Restores the status captured by changeStatus. Ignores an undo for another record. */
export function undoStatusChange(record: DiscRecord, undo: StatusUndo): DiscRecord {
  return record.id === undo.recordId ? { ...record, status: undo.previousStatus } : record;
}
