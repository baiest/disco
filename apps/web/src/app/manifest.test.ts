import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

const publicDir = join(__dirname, "../../public");

describe("web app manifest", () => {
  const app = manifest();

  it("opens the admin full screen, so the app does not look like a web page", () => {
    expect(app.start_url).toBe("/admin");
    expect(app.scope).toBe("/");
    expect(app.display).toBe("standalone");
    expect(app.name).toBe("Disco");
  });

  it("uses the store colours", () => {
    expect(app.background_color).toBe("#f4efe6");
    expect(app.theme_color).toBe("#b8420f");
  });

  it("lists icons that exist, including the two sizes Chrome needs to offer the install", () => {
    const icons = app.icons ?? [];
    expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const icon of icons) {
      expect(icon.type).toBe("image/png");
      expect(existsSync(join(publicDir, icon.src))).toBe(true);
    }
  });

  it("offers a maskable icon, so Android can crop it into its own shape", () => {
    expect((app.icons ?? []).some((icon) => icon.purpose === "maskable")).toBe(true);
  });
});
