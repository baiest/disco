import { describe, expect, it } from "vitest";
import { addToBatch, clearBatch, loadBatch } from "./batch-storage";
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
