import { describe, expect, it } from "vitest";
import { initialItems, mediaItemsReducer, slotsOf, uploadsInProgress, type MediaItem } from "./media-items";

const item = (id: string, overrides: Partial<MediaItem> = {}): MediaItem => ({
  id,
  kind: "photo",
  status: "preparing",
  progress: 0,
  previewUrl: `blob:${id}`,
  ...overrides,
});

describe("mediaItemsReducer", () => {
  it("adds an item at the end", () => {
    const state = mediaItemsReducer([item("a")], { type: "add", item: item("b") });
    expect(state.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("moves an item through uploading, with progress, to done", () => {
    let state = mediaItemsReducer(initialItems, { type: "add", item: item("a") });
    state = mediaItemsReducer(state, { type: "status", id: "a", status: "uploading" });
    state = mediaItemsReducer(state, { type: "progress", id: "a", progress: 62 });
    expect(state[0]).toMatchObject({ status: "uploading", progress: 62 });
    state = mediaItemsReducer(state, { type: "status", id: "a", status: "done" });
    expect(state[0]).toMatchObject({ status: "done", progress: 100 });
  });

  it("keeps progress between 0 and 100", () => {
    const state = [item("a", { status: "uploading" })];
    expect(mediaItemsReducer(state, { type: "progress", id: "a", progress: 140 })[0]?.progress).toBe(100);
    expect(mediaItemsReducer(state, { type: "progress", id: "a", progress: -5 })[0]?.progress).toBe(0);
  });

  it("records why an item failed and lets it start again", () => {
    let state = mediaItemsReducer([item("a", { status: "uploading", progress: 40 })], { type: "failed", id: "a", reason: "too_big" });
    expect(state[0]).toMatchObject({ status: "failed", reason: "too_big" });
    state = mediaItemsReducer(state, { type: "status", id: "a", status: "preparing" });
    expect(state[0]).toMatchObject({ status: "preparing", progress: 0 });
    expect(state[0]).not.toHaveProperty("reason");
  });

  it("notes a retry in progress", () => {
    const state = mediaItemsReducer([item("a", { status: "uploading" })], { type: "retrying", id: "a", attempt: 2 });
    expect(state[0]).toMatchObject({ status: "uploading", attempt: 2 });
  });

  it("removes an item and ignores unknown ids", () => {
    expect(mediaItemsReducer([item("a"), item("b")], { type: "remove", id: "a" }).map((i) => i.id)).toEqual(["b"]);
    const state = [item("a")];
    expect(mediaItemsReducer(state, { type: "status", id: "zzz", status: "done" })).toEqual(state);
  });

  it("starts over", () => {
    expect(mediaItemsReducer([item("a")], { type: "reset" })).toEqual([]);
  });
});

describe("slotsOf and uploadsInProgress", () => {
  const items = [
    item("a", { status: "done", position: 0 }),
    item("b", { status: "uploading", kind: "video" }),
    item("c", { status: "failed" }),
    item("d", { status: "preparing" }),
  ];

  it("counts every item that is not failed toward the limits", () => {
    expect(slotsOf(items)).toEqual([
      { kind: "photo", position: 0 },
      { kind: "video", position: 1 },
      { kind: "photo", position: 2 },
    ]);
  });

  it("tells whether something is still being prepared or uploaded", () => {
    expect(uploadsInProgress(items)).toBe(true);
    expect(uploadsInProgress([items[0] as MediaItem, items[2] as MediaItem])).toBe(false);
    expect(uploadsInProgress([])).toBe(false);
  });
});

describe("restoring uploaded media", () => {
  it("shows the files that were already uploaded, in their order, as done", () => {
    const state = mediaItemsReducer(initialItems, {
      type: "restore",
      items: [
        { id: "a", kind: "photo", previewUrl: "https://s/a", position: 0 },
        { id: "b", kind: "video", previewUrl: "https://s/b", position: 2 },
      ],
    });
    expect(state).toEqual([
      { id: "a", kind: "photo", status: "done", progress: 100, previewUrl: "https://s/a", position: 0 },
      { id: "b", kind: "video", status: "done", progress: 100, previewUrl: "https://s/b", position: 2 },
    ]);
  });

  it("keeps what is already on screen and never shows a file twice", () => {
    const current = [item("a", { status: "done", position: 0, previewUrl: "blob:local" }), item("c", { status: "uploading" })];
    const state = mediaItemsReducer(current, {
      type: "restore",
      items: [
        { id: "a", kind: "photo", previewUrl: "https://s/a", position: 0 },
        { id: "b", kind: "photo", previewUrl: "https://s/b", position: 1 },
      ],
    });
    expect(state.map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(state.find((i) => i.id === "a")?.previewUrl).toBe("blob:local");
  });
});

