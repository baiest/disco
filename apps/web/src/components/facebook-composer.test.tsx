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

// The publish button lives in the page header, so the composer is given the place for it.
function headerSlot() {
  const slot = document.createElement("div");
  document.body.append(slot);
  return slot;
}

function renderComposer(slot = headerSlot()) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FacebookComposer recordIds={["r1", "r2"]} media={media} initialText="hola" actionSlot={slot} />
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
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("FacebookComposer", () => {
  it("puts the publish button in the header, the only way to open Facebook, with no copy or paste step", () => {
    stubNavigator({});
    const slot = headerSlot();
    renderComposer(slot);
    expect(slot.querySelectorAll("button")).toHaveLength(1);
    expect(slot.textContent).toBe(messages.publish.loadingFiles);
    expect(screen.getAllByRole("button").map((item) => item.textContent)).toEqual([
      messages.publish.loadingFiles,
      messages.publish.done,
    ]);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByText("Copiar el texto")).toBeNull();
    expect(screen.queryByText("En Facebook, pega el texto y publica.")).toBeNull();
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

  it("copies the text by itself when it opens the share sheet, and says to paste it", async () => {
    const calls: string[] = [];
    const writeText = vi.fn(() => {
      calls.push("copy");
      return Promise.resolve();
    });
    const share = vi.fn(() => {
      calls.push("share");
      return Promise.resolve();
    });
    stubNavigator({ canShare: () => true, share, clipboard: { writeText } });
    renderComposer();
    await waitFor(() => {
      expect(button(messages.publish.share).disabled).toBe(false);
    });
    fireEvent.click(button(messages.publish.share));
    await waitFor(() => {
      expect(screen.getByText(messages.publish.sharedPasteHint)).toBeTruthy();
    });
    expect(calls).toEqual(["copy", "share"]);
    expect(writeText).toHaveBeenCalledWith("hola");
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: "hola" }));
  });

  it("does not copy anything when there is no text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ canShare: () => true, share: vi.fn().mockResolvedValue(undefined), clipboard: { writeText } });
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <FacebookComposer recordIds={["r1"]} media={media} initialText="" actionSlot={headerSlot()} />
      </NextIntlClientProvider>,
    );
    await waitFor(() => {
      expect(button(messages.publish.share).disabled).toBe(false);
    });
    fireEvent.click(button(messages.publish.share));
    await waitFor(() => {
      expect(screen.getByText(messages.publish.sharedHint)).toBeTruthy();
    });
    expect(writeText).not.toHaveBeenCalled();
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
