import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/es.json";

const loadBatchSummariesAction = vi.hoisted(() => vi.fn());
vi.mock("@/app/admin/batch-actions", () => ({ loadBatchSummariesAction }));

import { BatchSummaryCard } from "./batch-summary-card";

const A = "3f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f";
const B = "4f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f";

function item(id: string, mediaCount: number, thumbnailUrl: string | null = `https://s/${id}.jpg`) {
  return { id, title: `Disco ${id.slice(0, 2)}`, artist: null, mediaCount, thumbnailPath: null, thumbnailUrl };
}

function renderCard(showReview = true) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <BatchSummaryCard showReview={showReview} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BatchSummaryCard", () => {
  it("shows nothing while the batch is empty, and asks nothing", () => {
    const { container } = renderCard();
    expect(container.firstChild).toBeNull();
    expect(loadBatchSummariesAction).not.toHaveBeenCalled();
  });

  it("shows the miniatures, how many records and how many files, and a link to review", async () => {
    localStorage.setItem("disco:batch", JSON.stringify([A, B]));
    loadBatchSummariesAction.mockResolvedValue([item(A, 3), item(B, 2)]);
    const { container } = renderCard();
    await waitFor(() => {
      expect(screen.getByText("2 discos · 5 de 30 fotos y videos")).toBeTruthy();
    });
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(screen.getByRole("link", { name: messages.publish.batchReview }).getAttribute("href")).toBe(`/admin/publish?ids=${A},${B}`);
    expect(loadBatchSummariesAction).toHaveBeenCalledWith([A, B]);
  });

  it("can leave out the link to review, for screens that have their own button for it", async () => {
    localStorage.setItem("disco:batch", JSON.stringify([A]));
    loadBatchSummariesAction.mockResolvedValue([item(A, 1)]);
    renderCard(false);
    await waitFor(() => {
      expect(screen.getByText("1 disco · 1 de 30 fotos y videos")).toBeTruthy();
    });
    expect(screen.queryByRole("link", { name: messages.publish.batchReview })).toBeNull();
  });

  it("shows a record icon where there is no miniature", async () => {
    localStorage.setItem("disco:batch", JSON.stringify([A]));
    loadBatchSummariesAction.mockResolvedValue([item(A, 1, null)]);
    const { container } = renderCard();
    await waitFor(() => {
      expect(screen.getByText("1 disco · 1 de 30 fotos y videos")).toBeTruthy();
    });
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("shows four miniatures at most and says how many more there are", async () => {
    const ids = Array.from({ length: 6 }, (_, index) => `00000000-0000-4000-8000-00000000000${String(index)}`);
    localStorage.setItem("disco:batch", JSON.stringify(ids));
    loadBatchSummariesAction.mockResolvedValue(ids.map((id) => item(id, 1)));
    const { container } = renderCard();
    await waitFor(() => {
      expect(screen.getByText("y 2 más")).toBeTruthy();
    });
    expect(container.querySelectorAll("img")).toHaveLength(4);
  });

  it("forgets the records that can no longer be posted", async () => {
    localStorage.setItem("disco:batch", JSON.stringify([A, B]));
    loadBatchSummariesAction.mockResolvedValue([item(A, 2)]);
    renderCard();
    await waitFor(() => {
      expect(screen.getByText("1 disco · 2 de 30 fotos y videos")).toBeTruthy();
    });
    expect(JSON.parse(localStorage.getItem("disco:batch") ?? "[]")).toEqual([A]);
  });

  it("warns when the batch is over what one post holds", async () => {
    localStorage.setItem("disco:batch", JSON.stringify([A, B]));
    loadBatchSummariesAction.mockResolvedValue([item(A, 20), item(B, 12)]);
    renderCard();
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Pasaste el límite: sobran 2 fotos y videos. Quita algún disco.");
    });
  });

  it("disappears when the last record leaves", async () => {
    localStorage.setItem("disco:batch", JSON.stringify([A]));
    loadBatchSummariesAction.mockResolvedValue([]);
    const { container } = renderCard();
    await waitFor(() => {
      expect(loadBatchSummariesAction).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
    expect(localStorage.getItem("disco:batch")).toBeNull();
  });
});
