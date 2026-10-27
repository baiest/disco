import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/es.json";

vi.mock("@/app/admin/publish/actions", () => ({ markPostedAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./facebook-composer", () => ({
  FacebookComposer: ({ recordIds, media, actionSlot }: { recordIds: string[]; media: unknown[]; actionSlot: HTMLElement | null }) => (
    <div data-testid="composer" data-slot={actionSlot === null ? "no" : "yes"}>{`${recordIds.join(",")}|${String(media.length)}`}</div>
  ),
}));

import { PublishReview, type ReviewItem } from "./publish-review";

function item(id: string, files: number, overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id,
    title: `Disco ${id}`,
    artist: `Artista ${id}`,
    thumbnailUrl: `https://s/${id}.jpg`,
    media: Array.from({ length: files }, (_, index) => ({ id: `${id}-${String(index)}`, kind: "photo" as const, url: `https://s/${id}-${String(index)}.jpg` })),
    ...overrides,
  };
}

function renderReview(items: ReviewItem[]) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PublishReview items={items} initialText="hola" />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  localStorage.setItem("disco:batch", JSON.stringify(["a", "b", "c"]));
});

afterEach(cleanup);

describe("PublishReview", () => {
  it("lists every record with its miniature, title and files, and how much the post holds", () => {
    const { container } = renderReview([item("a", 3), item("b", 2)]);
    expect(screen.getByText("Disco a")).toBeTruthy();
    expect(screen.getByText("Disco b")).toBeTruthy();
    expect(container.querySelectorAll("li img")).toHaveLength(2);
    expect(screen.getByText("2 discos · 5 de 30 fotos y videos")).toBeTruthy();
    expect(screen.getByText("3 fotos y videos")).toBeTruthy();
  });

  it("lets the owner edit a record, which opens it", () => {
    renderReview([item("a", 1)]);
    expect(screen.getByRole("link", { name: `${messages.publish.edit} Disco a` }).getAttribute("href")).toBe("/admin/records/a");
  });

  it("takes a record out of the post and out of the batch kept on the phone", () => {
    renderReview([item("a", 3), item("b", 2)]);
    fireEvent.click(screen.getByRole("button", { name: `${messages.publish.removeFromBatch} Disco a` }));
    expect(screen.queryByText("Disco a")).toBeNull();
    expect(screen.getByText("1 disco · 2 de 30 fotos y videos")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("disco:batch") ?? "[]")).toEqual(["b", "c"]);
  });

  it("has a header with a way back, and gives the composer a place in it for the publish button", () => {
    const { container } = renderReview([item("a", 1)]);
    const header = container.querySelector("header");
    expect(header?.querySelector("a")?.getAttribute("href")).toBe("/admin");
    expect(header?.textContent).toContain(messages.publish.title);
    expect(screen.getByTestId("composer").dataset.slot).toBe("yes");
  });

  it("keeps the header with its way back when everything was taken out", () => {
    const { container } = renderReview([item("a", 1)]);
    fireEvent.click(screen.getByRole("button", { name: `${messages.publish.removeFromBatch} Disco a` }));
    expect(container.querySelector("header a")?.getAttribute("href")).toBe("/admin");
  });

  it("gives the composer only the records that are still in", () => {
    renderReview([item("a", 3), item("b", 2)]);
    expect(screen.getByTestId("composer").textContent).toBe("a,b|5");
    fireEvent.click(screen.getByRole("button", { name: `${messages.publish.removeFromBatch} Disco a` }));
    expect(screen.getByTestId("composer").textContent).toBe("b|2");
  });

  it("offers to add more discs, keeping the ones already chosen", () => {
    renderReview([item("a", 1), item("b", 1)]);
    expect(screen.getByRole("link", { name: messages.publish.addMore }).getAttribute("href")).toBe("/admin/publish?keep=a,b");
  });

  it("blocks publishing while it is over what a post holds, and unblocks when something is taken out", () => {
    renderReview([item("a", 20), item("b", 12)]);
    expect(screen.getByRole("alert").textContent).toContain("sobran 2 fotos y videos");
    expect(screen.queryByTestId("composer")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: `${messages.publish.removeFromBatch} Disco b` }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("composer")).toBeTruthy();
  });

  it("says so, with a way to choose discs, when everything was taken out", () => {
    renderReview([item("a", 1)]);
    fireEvent.click(screen.getByRole("button", { name: `${messages.publish.removeFromBatch} Disco a` }));
    expect(screen.getByText(messages.publish.emptyBatch)).toBeTruthy();
    expect(screen.getByRole("link", { name: messages.publish.pickDiscs }).getAttribute("href")).toBe("/admin/publish");
    expect(screen.queryByTestId("composer")).toBeNull();
  });

  it("falls back to plain words for a record without title or picture", () => {
    const { container } = renderReview([item("a", 1, { title: null, artist: null, thumbnailUrl: null })]);
    expect(screen.getByText(messages.publish.untitled)).toBeTruthy();
    expect(container.querySelector("li img")).toBeNull();
  });

  it("does not offer to publish when the records have no photos or videos to share", () => {
    renderReview([item("a", 0)]);
    expect(screen.getByRole("alert").textContent).toBe(messages.publish.noFiles);
    expect(screen.queryByTestId("composer")).toBeNull();
  });
});

