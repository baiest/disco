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

export function removeFromBatch(store: KeyValueStore, recordId: string): void {
  try {
    const rest = loadBatch(store).filter((id) => id !== recordId);
    if (rest.length === 0) {
      store.removeItem(KEY);
    } else {
      store.setItem(KEY, JSON.stringify(rest));
    }
  } catch {
    // Storage may be blocked; the screen keeps its own copy until it is reloaded.
  }
}

export function isInBatch(store: KeyValueStore, recordId: string): boolean {
  return loadBatch(store).includes(recordId);
}

const CHANGED = "disco:batch-changed";

/** Tells the other parts of the page (the bar, the buttons) that the batch changed; storage events do not fire in the same tab. */
export function notifyBatchChanged(): void {
  window.dispatchEvent(new Event(CHANGED));
}

/** Calls `listener` whenever the batch changes, here or in another tab. Returns a function to stop listening. */
export function onBatchChanged(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}

