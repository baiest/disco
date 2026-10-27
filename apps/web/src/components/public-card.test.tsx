import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import messages from "../../messages/es.json";
import type { PublicRecord } from "@/lib/public-catalog";
import { PublicCard } from "./public-card";

function record(overrides: Partial<PublicRecord> = {}): PublicRecord {
  return {
    id: "r1",
    title: "Ritmo de Santo",
    artist: "Candita",
    notes: null,
    status: "available",
    priceCop: null,
    mediaCount: 1,
    firstMediaPath: "o/r1/m.jpg",
    isClose: false,
    ...overrides,
  };
}

function renderCard(value: PublicRecord, pictureUrl: string | null = null) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PublicCard record={value} pictureUrl={pictureUrl} />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe("PublicCard", () => {
  it("shows the title and artist and links to the record", () => {
    renderCard(record());
    expect(screen.getByText("Ritmo de Santo")).toBeTruthy();
    expect(screen.getByText("Candita")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/disco/r1");
  });

  it("marks a sold record and not an available one", () => {
    const { unmount } = renderCard(record({ status: "sold" }));
    expect(screen.getByText(messages.catalog.sold)).toBeTruthy();
    unmount();
    renderCard(record());
    expect(screen.queryByText(messages.catalog.sold)).toBeNull();
  });

  it("shows the price only when there is one, grouped", () => {
    const { unmount } = renderCard(record({ priceCop: 80000 }));
    expect(screen.getByText("$80.000")).toBeTruthy();
    unmount();
    renderCard(record());
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it("shows the picture, or a record icon when there is none", () => {
    const { container, unmount } = renderCard(record(), "https://s/p.jpg");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://s/p.jpg");
    unmount();
    const empty = renderCard(record());
    expect(empty.container.querySelector("img")).toBeNull();
    expect(empty.container.querySelector("svg")).not.toBeNull();
  });

  it("labels a loose match and falls back to plain words for missing data", () => {
    renderCard(record({ isClose: true, title: null, artist: null }));
    expect(screen.getByText(messages.catalog.closeMatch)).toBeTruthy();
    expect(screen.getByText(messages.catalog.untitled)).toBeTruthy();
    expect(screen.getByText(messages.catalog.unknownArtist)).toBeTruthy();
  });
});
