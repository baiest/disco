import { describe, expect, it } from "vitest";
import { config } from "./proxy";

const [source = ""] = config.matcher;
const matcher = new RegExp(`^${source}$`);

describe("proxy matcher", () => {
  it("lets the manifest and icons through without a session, so the install works signed out", () => {
    expect(matcher.test("/manifest.webmanifest")).toBe(false);
    expect(matcher.test("/icons/icon-192.png")).toBe(false);
  });

  it("still checks the session on pages", () => {
    expect(matcher.test("/admin")).toBe(true);
    expect(matcher.test("/login")).toBe(true);
  });
});
