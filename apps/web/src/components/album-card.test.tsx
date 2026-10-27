import type { DiscRecord } from "@disco/domain";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import messages from "../../messages/es.json";
import { summarizeCopies } from "@disco/domain";
import { AlbumCard } from "./album-card";
import type { AlbumCard as Card } from "@/lib/inventory";

function copy(id: string, overrides: Partial<DiscRecord> = {}): DiscRecord {
  return {
    id,
    title: "Ritmo de Santo",
    artist: "Candita",
    priceCop: null,
    status: "available",
    notes: null,
    mediaCount: 1,
    updatedAt: "2026-10-01T00:00:00Z",
    deletedAt: null,
    soldAt: null,
    facebookPostedAt: null,
    facebookNeedsUpdate: false,
    ...overrides,
  };
}

function card(copies: DiscRecord[], overrides: Partial<Card> = {}): Card {
  const [summary] = summarizeCopies(copies);
  if (summary === undefined) {
    throw new Error("no copies");
  }
  return { summary, isClose: false, thumbnailPath: null, ...overrides };
}

function renderCard(value: Card, thumbnailUrl: string | null = null) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AlbumCard card={value} thumbnailUrl={thumbnailUrl} />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe("AlbumCard", () => {
  it("shows the title, the artist and the stock", () => {
    renderCard(card([copy("a")]));
    expect(screen.getByText("Ritmo de Santo")).toBeTruthy();
    expect(screen.getByText("Candita")).toBeTruthy();
    expect(screen.getByText("Lo tienes: 1 disponible")).toBeTruthy();
  });

  it("is one tappable card when there is a single copy", () => {
    renderCard(card([copy("a")]));
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toBe("/admin/records/a");
    expect(links[0]?.textContent).toContain("Ritmo de Santo");
    expect(screen.queryByText(/^Copia 1/)).toBeNull();
  });

  it("lists every copy as its own link when there are several", () => {
    renderCard(card([copy("a"), copy("b", { status: "sold", soldAt: "2026-10-12T12:00:00Z" })]));
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/admin/records/a", "/admin/records/b"]);
    expect(screen.getByText("Copia 1 · Disponible")).toBeTruthy();
    expect(screen.getByText("Copia 2 · Vendido")).toBeTruthy();
  });

  it("says plainly when it is not in stock any more", () => {
    renderCard(card([copy("a", { status: "sold", soldAt: "2026-10-12T12:00:00Z" })]));
    expect(screen.getByText(/No lo tienes ahora: 1 vendido el/)).toBeTruthy();
  });

  it("shows the picture when there is one, and a record icon when there is not", () => {
    const { container, rerender } = renderCard(card([copy("a")]), "https://s/photo.jpg");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://s/photo.jpg");
    rerender(
      <NextIntlClientProvider locale="es" messages={messages}>
        <AlbumCard card={card([copy("a")])} thumbnailUrl={null} />
      </NextIntlClientProvider>,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("labels a loose match", () => {
    renderCard(card([copy("a")], { isClose: true }));
    expect(screen.getByText(messages.inventory.closeMatch)).toBeTruthy();
  });

  it("falls back to plain words when the title or artist is missing", () => {
    renderCard(card([copy("a", { title: null, artist: null })]));
    expect(screen.getByText(messages.inventory.untitled)).toBeTruthy();
    expect(screen.getByText(messages.inventory.unknownArtist)).toBeTruthy();
  });
});
