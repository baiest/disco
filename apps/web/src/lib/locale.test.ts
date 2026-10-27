import { describe, expect, it } from "vitest";
import { resolveLocale } from "./locale";

const supported = ["es", "en"] as const;

describe("resolveLocale", () => {
  it("uses the saved choice when it is supported", () => {
    expect(resolveLocale({ cookie: "en", acceptLanguage: "es" }, supported, "es")).toBe("en");
  });

  it("ignores a saved choice that is not supported", () => {
    expect(resolveLocale({ cookie: "fr", acceptLanguage: "en" }, supported, "es")).toBe("en");
  });

  it("follows the browser language order and quality values", () => {
    expect(resolveLocale({ acceptLanguage: "fr;q=0.9,en;q=0.8,es;q=0.7" }, supported, "es")).toBe("en");
    expect(resolveLocale({ acceptLanguage: "en;q=0.5,es;q=0.9" }, supported, "en")).toBe("es");
  });

  it("matches a regional language by its base language", () => {
    expect(resolveLocale({ acceptLanguage: "en-US,en;q=0.9" }, supported, "es")).toBe("en");
    expect(resolveLocale({ acceptLanguage: "es-CO" }, supported, "en")).toBe("es");
  });

  it("is case insensitive", () => {
    expect(resolveLocale({ acceptLanguage: "EN-us" }, supported, "es")).toBe("en");
  });

  it.each([undefined, "", "fr,de;q=0.8", "*", ";q=0.5"])("falls back for the header %j", (header) => {
    expect(resolveLocale({ acceptLanguage: header }, supported, "es")).toBe("es");
  });

  it("falls back when there is nothing to go on", () => {
    expect(resolveLocale({}, supported, "es")).toBe("es");
  });

  it("works when only one language is supported", () => {
    expect(resolveLocale({ acceptLanguage: "en-US" }, ["es"], "es")).toBe("es");
  });
});
