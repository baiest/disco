import { describe, expect, it } from "vitest";
import { clearDraft, loadDraft, saveDraft, type DraftFields, type KeyValueStore } from "./draft-storage";

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

const fields: DraftFields = { title: "La Voz", artist: "Héctor Lavoe", priceText: "80 mil", notes: "LP" };

describe("draft storage", () => {
  it("saves the form and loads it back with its record id", () => {
    const store = memoryStore();
    saveDraft(store, "rec-1", fields);
    expect(loadDraft(store)).toEqual({ recordId: "rec-1", fields });
  });

  it("returns null when nothing was saved", () => {
    expect(loadDraft(memoryStore())).toBeNull();
  });

  it("ignores damaged or unexpected data", () => {
    for (const raw of ["not json", "42", '{"recordId":1}', '{"recordId":"x","fields":{"title":1}}', "null"]) {
      expect(loadDraft(memoryStore({ "disco:draft": raw }))).toBeNull();
    }
  });

  it("clears the draft", () => {
    const store = memoryStore();
    saveDraft(store, "rec-1", fields);
    clearDraft(store);
    expect(loadDraft(store)).toBeNull();
  });

  it("never throws when the browser refuses storage", () => {
    const blocked: KeyValueStore = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(() => {
      saveDraft(blocked, "rec-1", fields);
    }).not.toThrow();
    expect(loadDraft(blocked)).toBeNull();
    expect(() => {
      clearDraft(blocked);
    }).not.toThrow();
  });
});
