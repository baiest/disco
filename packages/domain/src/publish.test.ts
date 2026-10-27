import { describe, expect, it } from "vitest";
import { canPublish } from "./publish";
import { makeRecord } from "./test-helpers";

describe("canPublish", () => {
  it("allows a record with at least one photo, even with no other data", () => {
    expect(canPublish(makeRecord({ photoCount: 1 }))).toEqual({ ok: true });
  });

  it("rejects a record without photos", () => {
    expect(canPublish(makeRecord({ photoCount: 0 }))).toEqual({ ok: false, reason: "no_photo" });
  });

  it("does not require title, artist or price", () => {
    const record = makeRecord({ photoCount: 2, title: null, artist: null, priceCop: null });
    expect(canPublish(record)).toEqual({ ok: true });
  });
});
