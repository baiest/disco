import { describe, expect, it } from "vitest";
import { isKeyboardOpen } from "./keyboard";

describe("isKeyboardOpen", () => {
  it("is open when the visible area lost a keyboard's worth of height", () => {
    expect(isKeyboardOpen({ baselineHeight: 800, visibleHeight: 480 })).toBe(true);
  });

  it("is closed when the visible area is the whole screen", () => {
    expect(isKeyboardOpen({ baselineHeight: 800, visibleHeight: 800 })).toBe(false);
  });

  it("ignores small changes such as the browser bar sliding away", () => {
    expect(isKeyboardOpen({ baselineHeight: 800, visibleHeight: 740 })).toBe(false);
    expect(isKeyboardOpen({ baselineHeight: 800, visibleHeight: 681 })).toBe(false);
    expect(isKeyboardOpen({ baselineHeight: 800, visibleHeight: 680 })).toBe(true);
  });

  it("accepts a different threshold", () => {
    expect(isKeyboardOpen({ baselineHeight: 800, visibleHeight: 700, threshold: 50 })).toBe(true);
  });
});
