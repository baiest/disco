import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/es.json";

const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1";

function setUp(userAgent: string, standalone = false) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: standalone && query === "(display-mode: standalone)" }));
}

// The component keeps "closed" in memory when storage is blocked, so each test loads a fresh copy.
async function renderHint() {
  const { InstallHint } = await import("./install-hint");
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InstallHint />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.resetModules();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("InstallHint", () => {
  it("shows the Chrome steps on Android", async () => {
    setUp(ANDROID);
    await renderHint();
    expect(screen.getByRole("status").textContent).toContain(messages.install.android);
  });

  it("shows the Safari steps on an iPhone", async () => {
    setUp(IPHONE);
    await renderHint();
    expect(screen.getByRole("status").textContent).toContain(messages.install.ios);
  });

  it("shows nothing when the app is already opened from the home screen", async () => {
    setUp(ANDROID, true);
    await renderHint();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("goes away when closed and does not come back on the next visit", async () => {
    setUp(ANDROID);
    await renderHint();
    fireEvent.click(screen.getByRole("button", { name: messages.install.dismiss }));
    expect(screen.queryByRole("status")).toBeNull();

    cleanup();
    vi.resetModules();
    await renderHint();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("still works when the browser refuses to store anything", async () => {
    setUp(ANDROID);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await renderHint();
    fireEvent.click(screen.getByRole("button", { name: messages.install.dismiss }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
