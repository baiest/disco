import { describe, expect, it } from "vitest";
import { routeDecision } from "./auth-routes";

describe("routeDecision", () => {
  it.each(["/admin", "/admin/", "/admin/records/new", "/admin/records/123"])(
    "sends a signed-out visitor from %s to the login page",
    (pathname) => {
      expect(routeDecision(pathname, false)).toEqual({ redirectTo: "/login" });
    },
  );

  it.each(["/admin", "/admin/records/new"])("lets a signed-in user open %s", (pathname) => {
    expect(routeDecision(pathname, true)).toEqual({ redirectTo: null });
  });

  it("sends a signed-in user away from the login page", () => {
    expect(routeDecision("/login", true)).toEqual({ redirectTo: "/admin" });
  });

  it("shows the login page to a signed-out visitor", () => {
    expect(routeDecision("/login", false)).toEqual({ redirectTo: null });
  });

  it.each([true, false])("always lets the link confirmation through (signed in: %s)", (signedIn) => {
    expect(routeDecision("/auth/confirm", signedIn)).toEqual({ redirectTo: null });
  });

  it.each(["/", "/administrator", "/administrator/x", "/discos/abc"])("treats %s as public", (pathname) => {
    expect(routeDecision(pathname, false)).toEqual({ redirectTo: null });
  });
});
