import { describe, expect, it } from "vitest";
import { installHintFor } from "./install-hint";

const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

const base = { installed: false, dismissed: false, touchPoints: 0 };

describe("installHintFor", () => {
  it("tells Android visitors to use the Chrome menu", () => {
    expect(installHintFor({ ...base, userAgent: ANDROID })).toBe("android");
  });

  it("tells iPhone visitors to use the Safari share button", () => {
    expect(installHintFor({ ...base, userAgent: IPHONE })).toBe("ios");
  });

  it("recognises an iPad that presents itself as a Mac", () => {
    expect(installHintFor({ ...base, userAgent: IPAD_AS_MAC, touchPoints: 5 })).toBe("ios");
  });

  it("does not bother desktop visitors", () => {
    expect(installHintFor({ ...base, userAgent: DESKTOP })).toBeNull();
    expect(installHintFor({ ...base, userAgent: IPAD_AS_MAC })).toBeNull();
  });

  it("stays hidden once the app is installed or the hint was closed", () => {
    expect(installHintFor({ ...base, userAgent: ANDROID, installed: true })).toBeNull();
    expect(installHintFor({ ...base, userAgent: IPHONE, dismissed: true })).toBeNull();
  });
});
