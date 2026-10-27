import { describe, expect, it } from "vitest";
import { checkBatch, MAX_POST_MEDIA, MAX_POST_RECORDS, parseIds } from "./facebook-post";

const A = "3f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f";
const B = "4f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f";

describe("parseIds", () => {
  it("reads a comma separated list of ids", () => {
    expect(parseIds(`${A},${B}`)).toEqual([A, B]);
  });

  it("drops anything that is not an id, repeated ids and empty entries", () => {
    expect(parseIds(`${A},x,,${A}, ${B} ,../etc`)).toEqual([A, B]);
  });

  it("gives nothing for a missing parameter and reads a repeated one", () => {
    expect(parseIds(undefined)).toEqual([]);
    expect(parseIds("")).toEqual([]);
    expect(parseIds([A, B])).toEqual([A, B]);
  });

  it("keeps at most the number of records a post can hold", () => {
    const many = Array.from({ length: MAX_POST_RECORDS + 5 }, (_, index) =>
      `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    expect(parseIds(many.join(","))).toHaveLength(MAX_POST_RECORDS);
  });
});

describe("checkBatch", () => {
  it("adds up the photos and videos of the records", () => {
    expect(checkBatch([{ mediaCount: 3 }, { mediaCount: 2 }])).toEqual({ ok: true, total: 5 });
  });

  it("accepts exactly the limit and refuses one more", () => {
    expect(checkBatch([{ mediaCount: MAX_POST_MEDIA }])).toEqual({ ok: true, total: MAX_POST_MEDIA });
    expect(checkBatch([{ mediaCount: MAX_POST_MEDIA }, { mediaCount: 1 }])).toEqual({
      ok: false,
      reason: "too_many_media",
      total: MAX_POST_MEDIA + 1,
    });
  });

  it("refuses an empty batch and one with nothing to share", () => {
    expect(checkBatch([])).toEqual({ ok: false, reason: "empty", total: 0 });
    expect(checkBatch([{ mediaCount: 0 }])).toEqual({ ok: false, reason: "empty", total: 0 });
  });
});
