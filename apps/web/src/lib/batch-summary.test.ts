import { describe, expect, it } from "vitest";
import { batchTotals, buildBatchSummaries } from "./batch-summary";
import { MAX_POST_MEDIA } from "./facebook-post";

const records = [
  { id: "a", title: "La Voz", artist: "Lavoe" },
  { id: "b", title: null, artist: null },
  { id: "c", title: "Siembra", artist: "Blades" },
];

const media = [
  { recordId: "a", path: "o/a/1.mp4" },
  { recordId: "a", path: "o/a/2.jpg" },
  { recordId: "a", path: "o/a/3.jpg" },
  { recordId: "b", path: "o/b/1.mp4" },
  { recordId: "c", path: "o/c/1.webp" },
];

describe("buildBatchSummaries", () => {
  it("follows the order of the batch, not the order the database answered", () => {
    expect(buildBatchSummaries(["c", "a"], records, media).map((s) => s.id)).toEqual(["c", "a"]);
  });

  it("counts every file of a record and uses its first image as the miniature", () => {
    const [a] = buildBatchSummaries(["a"], records, media);
    expect(a).toEqual({ id: "a", title: "La Voz", artist: "Lavoe", mediaCount: 3, thumbnailPath: "o/a/2.jpg" });
  });

  it("has no miniature when no file is an image", () => {
    expect(buildBatchSummaries(["b"], records, media)[0]).toMatchObject({ mediaCount: 1, thumbnailPath: null });
  });

  it("leaves out what is no longer there, such as a sold or deleted record", () => {
    expect(buildBatchSummaries(["a", "gone", "c"], records, media).map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("shows a record once even if the batch lists it twice", () => {
    expect(buildBatchSummaries(["a", "a"], records, media)).toHaveLength(1);
  });

  it("gives nothing for an empty batch", () => {
    expect(buildBatchSummaries([], records, media)).toEqual([]);
  });
});

describe("batchTotals", () => {
  it("adds up the records and their files", () => {
    expect(batchTotals([{ mediaCount: 3 }, { mediaCount: 2 }])).toEqual({ records: 2, files: 5, over: false, left: MAX_POST_MEDIA - 5 });
  });

  it("says when the batch is over what one post holds, and by how much", () => {
    expect(batchTotals([{ mediaCount: MAX_POST_MEDIA }])).toMatchObject({ over: false, left: 0 });
    expect(batchTotals([{ mediaCount: MAX_POST_MEDIA }, { mediaCount: 2 }])).toMatchObject({ over: true, left: -2 });
  });

  it("handles an empty batch", () => {
    expect(batchTotals([])).toEqual({ records: 0, files: 0, over: false, left: MAX_POST_MEDIA });
  });
});
