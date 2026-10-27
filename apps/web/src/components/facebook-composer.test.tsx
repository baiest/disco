import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/es.json";

const markPostedAction = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
vi.mock("@/app/admin/publish/actions", () => ({ markPostedAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { FacebookComposer } from "./facebook-composer";

const media = [
  { id: "m1", kind: "photo" as const, url: "https://s/1" },
  { id: "m2", kind: "video" as const, url: "https://s/2" },
];

function renderComposer() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FacebookComposer recordIds={["r1", "r2"]} media={media} initialText="hola" />
    </NextIntlClientProvider>,
  );
}

const button = (name: string) => screen.getByRole<HTMLButtonElement>("button", { name });

function stubNavigator(overrides: Record<string, unknown>) {
  vi.stubGlobal("navigator", { ...overrides });
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(["x"])) })),
  );
  localStorage.setItem("disco:batch", JSON.stringify(["r1", "r2"]));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("FacebookComposer", () => {
  it("copies the text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ clipboard: { writeText } });
    renderComposer();
    fireEvent.click(button(messages.publish.copy));
    await waitFor(() => {
      expect(screen.getByText(messages.publish.copied)).toBeTruthy();
    });
    expect(writeText).toHaveBeenCalledWith("hola");
  });

  it("says when the text could not be copied", async () => {
    stubNavigator({});
    renderComposer();
    fireEvent.click(button(messages.publish.copy));
    await waitFor(() => {
      expect(screen.getByText(messages.publish.copyFailed)).toBeTruthy();
    });
  });

  it("shares the files once they are ready", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ canShare: () => true, share });
    renderComposer();
    await waitFor(() => {
      expect(button(messages.publish.share).disabled).toBe(false);
    });
    fireEvent.click(button(messages.publish.share));
    await waitFor(() => {
      expect(screen.getByText(messages.publish.sharedHint)).toBeTruthy();
    });
    const sent = (share.mock.calls[0] as [{ files: File[] }])[0].files;
    expect(sent.map((file) => file.name)).toEqual(["m1.jpg", "m2.mp4"]);
  });

  it("offers the files to save when the phone cannot share them", async () => {
    stubNavigator({});
    renderComposer();
    await waitFor(() => {
      expect(button(messages.publish.share).disabled).toBe(false);
    });
    fireEvent.click(button(messages.publish.share));
    await waitFor(() => {
      expect(screen.getByText(messages.publish.unsupported)).toBeTruthy();
    });
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("lets the owner retry when the files could not be prepared", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
    stubNavigator({});
    renderComposer();
    await waitFor(() => {
      expect(screen.getByText(messages.publish.loadFailed)).toBeTruthy();
    });
    expect(button(messages.publish.retry)).toBeTruthy();
  });

  it("marks the records as posted, forgets the batch and goes back", async () => {
    markPostedAction.mockResolvedValue({ ok: true });
    stubNavigator({});
    renderComposer();
    fireEvent.click(button(messages.publish.done));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/admin");
    });
    expect(markPostedAction).toHaveBeenCalledWith(["r1", "r2"]);
    expect(localStorage.getItem("disco:batch")).toBeNull();
  });

  it("stays on the page and explains when marking fails", async () => {
    markPostedAction.mockResolvedValue({ ok: false, reason: "failed" });
    stubNavigator({});
    renderComposer();
    fireEvent.click(button(messages.publish.done));
    await waitFor(() => {
      expect(screen.getByText(messages.publish.doneError.failed)).toBeTruthy();
    });
    expect(push).not.toHaveBeenCalled();
    expect(localStorage.getItem("disco:batch")).not.toBeNull();
  });
});
