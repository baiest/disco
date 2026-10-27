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

  it("opens with the sign out button and no publish link, which has its own button on the home screen", () => {
    renderMenu();
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(publishLink()).toBeNull();
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
    const button = signOutButton();
    expect(button).not.toBeNull();
    fireEvent.pointerDown(button as HTMLElement);
    expect(signOutButton()).not.toBeNull();
  });
});
