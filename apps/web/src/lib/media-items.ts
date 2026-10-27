import type { MediaKind, MediaSlot } from "@disco/domain";

export type ItemStatus = "preparing" | "uploading" | "done" | "failed";

/** One photo or video in the form, from the moment it is picked until it is saved. */
export interface MediaItem {
  id: string;
  kind: MediaKind;
  status: ItemStatus;
  /** 0 to 100 while uploading. */
  progress: number;
  previewUrl: string;
  position?: number;
  /** Why it failed, as a code the screen turns into text. */
  reason?: string;
  /** Upload attempt in progress, when it is being retried. */
  attempt?: number;
}

export type MediaItemsAction =
  | { type: "add"; item: MediaItem }
  | { type: "status"; id: string; status: ItemStatus; position?: number }
  | { type: "progress"; id: string; progress: number }
  | { type: "failed"; id: string; reason: string }
  | { type: "retrying"; id: string; attempt: number }
  | { type: "remove"; id: string }
  | { type: "restore"; items: RestoredItem[] }
  | { type: "reset" };

/** A file that was uploaded in an earlier visit, read back from the server. */
export interface RestoredItem {
  id: string;
  kind: MediaKind;
  previewUrl: string;
  position: number;
}

export const initialItems: MediaItem[] = [];

function withoutDetails(item: MediaItem): MediaItem {
  const copy = { ...item };
  delete copy.reason;
  delete copy.attempt;
  return copy;
}

function update(items: readonly MediaItem[], id: string, change: (item: MediaItem) => MediaItem): MediaItem[] {
  return items.map((item) => (item.id === id ? change(item) : item));
}

export function mediaItemsReducer(items: readonly MediaItem[], action: MediaItemsAction): MediaItem[] {
  switch (action.type) {
    case "add":
      return [...items, action.item];
    case "status":
      return update(items, action.id, (current) => {
        const item = withoutDetails(current);
        return {
          ...item,
          status: action.status,
          progress: action.status === "done" ? 100 : action.status === "preparing" ? 0 : item.progress,
          ...(action.position === undefined ? {} : { position: action.position }),
        };
      });
    case "progress":
      return update(items, action.id, (item) => ({ ...item, progress: Math.min(100, Math.max(0, action.progress)) }));
    case "failed":
      return update(items, action.id, (current) => {
        const item = { ...current };
        delete item.attempt;
        return { ...item, status: "failed", reason: action.reason };
      });
    case "retrying":
      return update(items, action.id, (item) => ({ ...item, status: "uploading", attempt: action.attempt }));
    case "remove":
      return items.filter((item) => item.id !== action.id);
    case "restore": {
      const known = new Set(items.map((item) => item.id));
      const restored = action.items
        .filter((entry) => !known.has(entry.id))
        .sort((a, b) => a.position - b.position)
        .map((entry): MediaItem => ({ ...entry, status: "done", progress: 100 }));
      return [...restored, ...items];
    }
    case "reset":
      return [];
  }
}

/** The places the items take in the record, for checking the limits. Failed items do not count. */
export function slotsOf(items: readonly MediaItem[]): MediaSlot[] {
  const counted = items.filter((item) => item.status !== "failed");
  const used = new Set(counted.flatMap((item) => (item.position === undefined ? [] : [item.position])));
  let next = 0;
  return counted.map((item) => {
    if (item.position !== undefined) {
      return { kind: item.kind, position: item.position };
    }
    while (used.has(next)) {
      next += 1;
    }
    used.add(next);
    return { kind: item.kind, position: next };
  });
}

export function uploadsInProgress(items: readonly MediaItem[]): boolean {
  return items.some((item) => item.status === "preparing" || item.status === "uploading");
}
