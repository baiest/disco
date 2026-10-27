import type { KeyValueStore } from "./draft-storage";

const KEY = "disco:batch";

/** The records saved since the last post, so the owner can publish them together at the end. */
export function loadBatch(store: KeyValueStore): string[] {
  try {
    const raw = store.getItem(KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function addToBatch(store: KeyValueStore, recordId: string): void {
  try {
    const current = loadBatch(store);
    if (!current.includes(recordId)) {
      store.setItem(KEY, JSON.stringify([...current, recordId]));
    }
  } catch {
    // Storage may be full or blocked; the owner can still pick the records by hand.
  }
}

export function clearBatch(store: KeyValueStore): void {
  try {
    store.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}
