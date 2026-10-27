import { describe, expect, it } from "vitest";
import { userIdFromClaims } from "./claims";

describe("userIdFromClaims", () => {
  it("reads the user id from a valid session", () => {
    expect(userIdFromClaims({ data: { claims: { sub: "u1" } }, error: null })).toBe("u1");
  });

  it("is null when there is no session or the check failed", () => {
    expect(userIdFromClaims({ data: null, error: null })).toBeNull();
    expect(userIdFromClaims({ data: { claims: { sub: "u1" } }, error: { message: "expired" } })).toBeNull();
  });

  it("is null when the claims carry no usable id", () => {
    expect(userIdFromClaims({ data: { claims: {} }, error: null })).toBeNull();
    expect(userIdFromClaims({ data: { claims: { sub: "" } }, error: null })).toBeNull();
    expect(userIdFromClaims({ data: { claims: { sub: 7 } }, error: null })).toBeNull();
  });
});
