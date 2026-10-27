import { describe, expect, it } from "vitest";
import { backTarget, recordHref } from "./back-target";

const A = "3f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f";
const B = "4f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f";

describe("recordHref", () => {
  it("opens a record from the post being put together, remembering which records it holds", () => {
    expect(recordHref(A, [A, B])).toBe(`/admin/records/${A}?from=publish&ids=${A},${B}`);
  });
});

describe("backTarget", () => {
  it("goes back to the list by default", () => {
    expect(backTarget({})).toBe("/admin");
    expect(backTarget({ ids: A })).toBe("/admin");
  });

  it("goes back to the post being put together when that is where the owner came from", () => {
    expect(backTarget({ from: "publish", ids: `${A},${B}` })).toBe(`/admin/publish?ids=${A},${B}`);
  });

  it("goes back to the list when the post has no valid records, or the origin is anything else", () => {
    expect(backTarget({ from: "publish" })).toBe("/admin");
    expect(backTarget({ from: "publish", ids: "../../evil" })).toBe("/admin");
    expect(backTarget({ from: "https://evil.example", ids: A })).toBe("/admin");
  });

  it("accepts the values as the address gives them, which may be lists", () => {
    expect(backTarget({ from: ["publish"], ids: [A, B] })).toBe(`/admin/publish?ids=${A},${B}`);
  });
});
