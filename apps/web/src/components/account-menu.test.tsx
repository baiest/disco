import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/es.json";

vi.mock("@/app/admin/actions", () => ({ signOut: vi.fn() }));

import { AccountMenu } from "./account-menu";

function renderMenu() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AccountMenu />
    </NextIntlClientProvider>,
  );
}

const toggle = () => screen.getByRole("button", { name: messages.admin.menuLabel });
const publishLink = () => screen.queryByRole("link", { name: messages.publish.title });
const signOutButton = () => screen.queryByRole("button", { name: messages.admin.signOut });

afterEach(cleanup);

describe("AccountMenu", () => {
  it("starts closed", () => {
    renderMenu();
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(publishLink()).toBeNull();
    expect(signOutButton()).toBeNull();
  });

  it("opens with the publish link and the sign out button", () => {
    renderMenu();
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(publishLink()?.getAttribute("href")).toBe("/admin/publish");
    expect(signOutButton()).not.toBeNull();
  });

  it("closes when the button is tapped again", () => {
    renderMenu();
    fireEvent.click(toggle());
    fireEvent.click(toggle());
    expect(publishLink()).toBeNull();
  });

  it("closes with Escape", () => {
    renderMenu();
    fireEvent.click(toggle());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(publishLink()).toBeNull();
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
  });

  it("closes when the owner taps outside", () => {
    renderMenu();
    fireEvent.click(toggle());
    fireEvent.pointerDown(document.body);
    expect(publishLink()).toBeNull();
  });

  it("stays open when the tap is inside the menu", () => {
    renderMenu();
    fireEvent.click(toggle());
    const link = publishLink();
    expect(link).not.toBeNull();
    fireEvent.pointerDown(link as HTMLElement);
    expect(publishLink()).not.toBeNull();
  });

  it("closes after choosing an option", () => {
    renderMenu();
    fireEvent.click(toggle());
    fireEvent.click(publishLink() as HTMLElement);
    expect(publishLink()).toBeNull();
  });
});
