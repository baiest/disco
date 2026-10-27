import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import messages from "../../messages/es.json";
import type { PublicRecord } from "@/lib/public-catalog";
import { PublicRecordView } from "./public-record-view";

function record(overrides: Partial<PublicRecord> = {}): PublicRecord {
  return {
    id: "r1",
    title: "Ritmo de Santo",
    artist: "Candita",
    notes: "LP original americano\nBuen estado",
    status: "available",
    priceCop: null,
    mediaCount: 2,
    firstMediaPath: null,
    isClose: false,
    ...overrides,
  };
}

const media = [
  { id: "m1", kind: "photo" as const, url: "https://s/1.jpg" },
  { id: "m2", kind: "video" as const, url: "https://s/2.mp4" },
];

function renderView(value: PublicRecord, whatsappUrl: string | null = "https://wa.me/573001234567?text=hola") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PublicRecordView record={value} media={media} whatsappUrl={whatsappUrl} />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe("PublicRecordView", () => {
  it("shows the title, artist and notes", () => {
    renderView(record());
    expect(screen.getByRole("heading", { name: "Ritmo de Santo" })).toBeTruthy();
    expect(screen.getByText("Candita")).toBeTruthy();
    expect(screen.getByText(/LP original americano/)).toBeTruthy();
  });

  it("shows every photo and video", () => {
    const { container } = renderView(record());
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://s/1.jpg");
    expect(container.querySelector("video")?.getAttribute("src")).toBe("https://s/2.mp4");
  });

  it("offers a WhatsApp button for an available record", () => {
    renderView(record());
    const button = screen.getByRole("link", { name: messages.catalog.askWhatsapp });
    expect(button.getAttribute("href")).toBe("https://wa.me/573001234567?text=hola");
  });

  it("has no button when the shop's number is not set", () => {
    renderView(record(), null);
    expect(screen.queryByRole("link", { name: messages.catalog.askWhatsapp })).toBeNull();
  });

  it("says a sold record is sold and has no buy button", () => {
    renderView(record({ status: "sold" }));
    expect(screen.getByText(messages.catalog.soldNotice)).toBeTruthy();
    expect(screen.queryByRole("link", { name: messages.catalog.askWhatsapp })).toBeNull();
  });

  it("shows the price only when there is one", () => {
    const { unmount } = renderView(record({ priceCop: 1500000 }));
    expect(screen.getByText("$1.500.000")).toBeTruthy();
    unmount();
    renderView(record());
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it("falls back to plain words and shows no notes when there are none", () => {
    renderView(record({ title: null, artist: null, notes: null }));
    expect(screen.getByRole("heading", { name: messages.catalog.untitled })).toBeTruthy();
    expect(screen.getByText(messages.catalog.unknownArtist)).toBeTruthy();
  });
});
