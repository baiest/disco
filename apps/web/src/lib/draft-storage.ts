export interface KeyValueStore {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface DraftFields {
  title: string;
  artist: string;
  priceText: string;
  notes: string;
}

const KEY = "disco:draft";
const FIELD_NAMES = ["title", "artist", "priceText", "notes"] as const;

function isFields(value: unknown): value is DraftFields {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return FIELD_NAMES.every((name) => typeof record[name] === "string");
}

/** Keeps what was typed so a closed tab or a lost connection does not lose it. Never throws. */
export function saveDraft(store: KeyValueStore, recordId: string, fields: DraftFields): void {
  try {
    store.setItem(KEY, JSON.stringify({ recordId, fields }));
  } catch {
    // Storage may be full or blocked; the form still works without it.
  }
}

export function loadDraft(store: KeyValueStore): { recordId: string; fields: DraftFields } | null {
  try {
    const raw = store.getItem(KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const { recordId, fields } = parsed as Record<string, unknown>;
    return typeof recordId === "string" && isFields(fields) ? { recordId, fields } : null;
  } catch {
    return null;
  }
}

export function clearDraft(store: KeyValueStore): void {
  try {
    store.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}
