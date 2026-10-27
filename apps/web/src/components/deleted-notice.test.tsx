import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/es.json";

vi.mock("@/app/admin/actions", () => ({ restoreRecordAction: vi.fn() }));

import { DeletedNotice } from "./deleted-notice";

afterEach(cleanup);

describe("DeletedNotice", () => {
  it("says the record was deleted and offers to undo it", () => {
    const { container } = render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <DeletedNotice recordId="r1" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("status").textContent).toContain(messages.inventory.deletedNotice);
    expect(screen.getByRole("button", { name: messages.inventory.deletedUndo })).toBeTruthy();
    expect(container.querySelector<HTMLInputElement>('input[name="id"]')?.value).toBe("r1");
  });

  it("can be closed, which is a plain link back to the list", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <DeletedNotice recordId="r1" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: messages.inventory.deletedDismiss }).getAttribute("href")).toBe("/admin");
  });
});
