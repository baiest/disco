import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/es.json";

const loadBatchSummariesAction = vi.hoisted(() => vi.fn());
vi.mock("@/app/admin/batch-actions", () => ({ loadBatchSummariesAction }));

import { PublishPicker, type PickerRow } from "./publish-picker";

const A = "3f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f";
const B = "4f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f";

const rows: PickerRow[] = [
  { id: A, title: "Abbey Road", files: 3, state: "Sin publicar", thumbnailUrl: "https://s/a.jpg" },
  { id: B, title: null, files: 1, state: "Publicado el 3 oct", thumbnailUrl: null },
];

function renderPicker(query = "") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PublishPicker rows={rows} query={query} />
    </NextIntlClientProvider>,
  );
}

const stored = () => JSON.parse(localStorage.getItem("disco:batch") ?? "[]") as string[];
const prepare = () => screen.getByRole<HTMLAnchorElement>("link", { name: /Preparar publicación/ });

beforeEach(() => {
  localStorage.clear();
  // The batch card drops what the server no longer returns, so by default it returns what it is asked for.
  loadBatchSummariesAction.mockImplementation((ids: string[]) =>
    Promise.resolve(ids.map((id) => ({ id, title: "Disco", artist: null, mediaCount: 1, thumbnailPath: null, thumbnailUrl: null }))),
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PublishPicker", () => {
  it("lists every disc with its miniature, files and state", () => {
    const { container } = renderPicker();
    expect(screen.getByText("Abbey Road")).toBeTruthy();
    expect(screen.getByText(messages.publish.untitled)).toBeTruthy();
    expect(screen.getByText(/3 fotos y videos · Sin publicar/)).toBeTruthy();
    expect(container.querySelectorAll("li img")).toHaveLength(1);
  });

  it("puts a disc in the post when it is ticked, and takes it out when it is unticked", async () => {
    renderPicker();
    const box = screen.getByRole<HTMLInputElement>("checkbox", { name: /Abbey Road/ });
    fireEvent.click(box);
    expect(stored()).toEqual([A]);
    await waitFor(() => {
      expect(box.checked).toBe(true);
    });
    fireEvent.click(box);
    expect(stored()).toEqual([]);
    await waitFor(() => {
      expect(box.checked).toBe(false);
    });
  });

  it("shows ticked the discs that were already chosen, even in a new search", async () => {
    localStorage.setItem("disco:batch", JSON.stringify([B]));
    renderPicker("beatles");
    await waitFor(() => {
      expect(screen.getByRole<HTMLInputElement>("checkbox", { name: new RegExp(messages.publish.untitled) }).checked).toBe(true);
    });
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /Abbey Road/ }).checked).toBe(false);
  });

  it("keeps what was typed in the search box and searches on the same screen", () => {
    renderPicker("beatles");
    const box = screen.getByRole<HTMLInputElement>("searchbox");
    expect(box.value).toBe("beatles");
    expect(box.form?.getAttribute("action")).toBe("/admin/publish");
  });

  it("cannot prepare anything until a disc is chosen, then prepares exactly the chosen ones", async () => {
    renderPicker();
    expect(prepare().getAttribute("aria-disabled")).toBe("true");
    expect(prepare().getAttribute("href")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /Abbey Road/ }));
    await waitFor(() => {
      expect(prepare().getAttribute("href")).toBe(`/admin/publish?ids=${A}`);
    });
    expect(prepare().textContent).toContain("(1)");
  });

  it("shows what was chosen above the list, without a second button to review it", async () => {
    localStorage.setItem("disco:batch", JSON.stringify([A]));
    loadBatchSummariesAction.mockResolvedValue([
      { id: A, title: "Abbey Road", artist: null, mediaCount: 3, thumbnailPath: null, thumbnailUrl: "https://s/a.jpg" },
    ]);
    renderPicker();
    await waitFor(() => {
      expect(screen.getByText("1 disco · 3 de 30 fotos y videos")).toBeTruthy();
    });
    expect(screen.queryByRole("link", { name: messages.publish.batchReview })).toBeNull();
  });
});
