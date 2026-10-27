import { describe, expect, it } from "vitest";
import { addToBatch, clearBatch, isInBatch, loadBatch, notifyBatchChanged, onBatchChanged, removeFromBatch } from "./batch-storage";
import type { KeyValueStore } from "./draft-storage";

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const broken: KeyValueStore = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("full");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("batch storage", () => {
  it("starts empty", () => {
    expect(loadBatch(memoryStore())).toEqual([]);
  });

  it("remembers the records saved in this session, in order, without repeats", () => {
    const store = memoryStore();
    addToBatch(store, "a");
    addToBatch(store, "b");
    addToBatch(store, "a");
    expect(loadBatch(store)).toEqual(["a", "b"]);
  });

  it("forgets them on request", () => {
    const store = memoryStore();
    addToBatch(store, "a");
    clearBatch(store);
    expect(loadBatch(store)).toEqual([]);
  });

  it("ignores stored data that is not a list of ids", () => {
    const store = memoryStore();
    store.setItem("disco:batch", "{oops");
    expect(loadBatch(store)).toEqual([]);
    store.setItem("disco:batch", JSON.stringify([1, "a", null]));
    expect(loadBatch(store)).toEqual(["a"]);
    store.setItem("disco:batch", JSON.stringify({ a: 1 }));
    expect(loadBatch(store)).toEqual([]);
  });

  it("never throws when the browser blocks storage", () => {
    expect(() => {
      addToBatch(broken, "a");
      clearBatch(broken);
    }).not.toThrow();
    expect(loadBatch(broken)).toEqual([]);
  });
});

describe("removing from the batch", () => {
  it("takes one record out and keeps the order of the rest", () => {
    const store = memoryStore();
    ["a", "b", "c"].forEach((id) => {
      addToBatch(store, id);
    });
    removeFromBatch(store, "b");
    expect(loadBatch(store)).toEqual(["a", "c"]);
  });

  it("ignores a record that is not there, and never throws when storage is blocked", () => {
    const store = memoryStore();
    addToBatch(store, "a");
    removeFromBatch(store, "zzz");
    expect(loadBatch(store)).toEqual(["a"]);
    expect(() => {
      removeFromBatch(broken, "a");
    }).not.toThrow();
  });

  it("clears the key when the last record leaves", () => {
    const store = memoryStore();
    addToBatch(store, "a");
    removeFromBatch(store, "a");
    expect(loadBatch(store)).toEqual([]);
    expect(store.data.has("disco:batch")).toBe(false);
  });
});

describe("isInBatch", () => {
  it("tells whether a record is in the batch", () => {
    const store = memoryStore();
    addToBatch(store, "a");
    expect(isInBatch(store, "a")).toBe(true);
    expect(isInBatch(store, "b")).toBe(false);
    expect(isInBatch(broken, "a")).toBe(false);
  });
});

describe("batch change notices", () => {
  it("tells every listener when the batch changes, and stops when unsubscribed", () => {
    let calls = 0;
    const stop = onBatchChanged(() => {
      calls += 1;
    });
    notifyBatchChanged();
    notifyBatchChanged();
    stop();
    notifyBatchChanged();
    expect(calls).toBe(2);
  });
});

