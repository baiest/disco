import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/es.json";

const actions = vi.hoisted(() => ({
  changeStatusAction: vi.fn(),
  undoStatusAction: vi.fn(),
  saveFieldsAction: vi.fn(),
  deleteRecordAction: vi.fn(),
  setPricePublicAction: vi.fn(),
}));
const push = vi.hoisted(() => vi.fn());
vi.mock("@/app/admin/records/[id]/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { RecordDetail } from "./record-detail";

const fields = { title: "Ritmo", artist: "", priceText: "", notes: "" };

function renderDetail(status: "draft" | "available" | "sold" = "available", postedOnFacebook = false, showPricePublic = false, priceText = "") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RecordDetail recordId="r1" initialStatus={status} initialFields={{ ...fields, priceText }} soldOn={null} media={[]} postedOnFacebook={postedOnFacebook} showPricePublic={showPricePublic} />
    </NextIntlClientProvider>,
  );
}

const button = (name: string) => screen.getByRole<HTMLButtonElement>("button", { name });
const current = () => screen.getByTestId("current-status").textContent;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RecordDetail", () => {
  it("changes the status, offers undo, and goes back when asked", async () => {
    actions.changeStatusAction.mockResolvedValue({ ok: true, previousStatus: "available" });
    actions.undoStatusAction.mockResolvedValue({ ok: true });
    renderDetail();
    fireEvent.click(button(messages.detail.status.sold));
    await waitFor(() => {
      expect(current()).toBe(messages.detail.status.sold);
    });
    expect(actions.changeStatusAction).toHaveBeenCalledWith({ recordId: "r1", status: "sold" });

    fireEvent.click(button(messages.detail.undo));
    await waitFor(() => {
      expect(current()).toBe(messages.detail.status.available);
    });
    expect(actions.undoStatusAction).toHaveBeenCalledWith({ recordId: "r1", previousStatus: "available" });
  });

  it("does not offer the status it already has", () => {
    renderDetail();
    expect(button(messages.detail.status.available).disabled).toBe(true);
    expect(button(messages.detail.status.sold).disabled).toBe(false);
  });

  it("explains a refused change in plain words and keeps the status", async () => {
    actions.changeStatusAction.mockResolvedValue({ ok: false, reason: "failed" });
    renderDetail();
    fireEvent.click(button(messages.detail.status.sold));
    await waitFor(() => {
      expect(screen.getByText(messages.detail.statusError.failed)).toBeTruthy();
    });
    expect(current()).toBe(messages.detail.status.available);
    expect(screen.queryByRole("button", { name: messages.detail.undo })).toBeNull();
  });

  it("offers only publish for a draft", () => {
    renderDetail("draft");
    expect(button(messages.detail.publish)).toBeTruthy();
    expect(screen.queryByRole("button", { name: messages.detail.status.sold })).toBeNull();
  });

  it("saves the fields and says so", async () => {
    actions.saveFieldsAction.mockResolvedValue({ ok: true });
    renderDetail();
    fireEvent.change(screen.getByLabelText(messages.capture.fields.price), { target: { value: "80 mil" } });
    fireEvent.click(button(messages.detail.save));
    await waitFor(() => {
      expect(screen.getByText(messages.detail.saved)).toBeTruthy();
    });
    expect(actions.saveFieldsAction).toHaveBeenCalledWith({
      recordId: "r1",
      input: { ...fields, priceText: "80 mil" },
    });
  });

  it("shows what is wrong with a field", async () => {
    actions.saveFieldsAction.mockResolvedValue({ ok: false, reason: "invalid_input", errors: { priceText: "invalid_price" } });
    renderDetail();
    fireEvent.click(button(messages.detail.save));
    await waitFor(() => {
      expect(screen.getByText(messages.capture.fieldError.invalid_price)).toBeTruthy();
    });
  });

  it("shows a save failure without a technical message", async () => {
    actions.saveFieldsAction.mockResolvedValue({ ok: false, reason: "failed" });
    renderDetail();
    fireEvent.click(button(messages.detail.save));
    await waitFor(() => {
      expect(screen.getByText(messages.detail.saveError.failed)).toBeTruthy();
    });
  });

  it("shows the saved price grouped and keeps grouping as it is edited", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <RecordDetail recordId="r1" initialStatus="available" initialFields={{ ...fields, priceText: "80000" }} soldOn={null} media={[]} postedOnFacebook={false} showPricePublic={false} />
      </NextIntlClientProvider>,
    );
    const price = screen.getByLabelText<HTMLInputElement>(messages.capture.fields.price);
    expect(price.value).toBe("80.000");
    fireEvent.change(price, { target: { value: "1200000" } });
    expect(price.value).toBe("1.200.000");
  });

  describe("deleting the record", () => {
    const open = () => {
      fireEvent.click(button(messages.detail.deleteButton));
    };

    it("asks first and deletes nothing until it is confirmed", () => {
      renderDetail();
      expect(screen.queryByRole("alertdialog")).toBeNull();
      open();
      expect(screen.getByRole("alertdialog", { name: messages.detail.deleteTitle })).toBeTruthy();
      expect(actions.deleteRecordAction).not.toHaveBeenCalled();
    });

    it("keeps the record when the owner changes his mind", () => {
      renderDetail();
      open();
      fireEvent.click(button(messages.detail.deleteCancel));
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(actions.deleteRecordAction).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    });

    it("deletes it and goes back to the list, offering to undo", async () => {
      actions.deleteRecordAction.mockResolvedValue({ ok: true });
      renderDetail();
      open();
      fireEvent.click(button(messages.detail.deleteConfirm));
      await waitFor(() => {
        expect(push).toHaveBeenCalledWith("/admin?undo=r1");
      });
      expect(actions.deleteRecordAction).toHaveBeenCalledWith("r1");
    });

    it("stays on the screen and explains when it could not be deleted", async () => {
      actions.deleteRecordAction.mockResolvedValue({ ok: false, reason: "failed" });
      renderDetail();
      open();
      fireEvent.click(button(messages.detail.deleteConfirm));
      await waitFor(() => {
        expect(screen.getByText(messages.detail.deleteError.failed)).toBeTruthy();
      });
      expect(push).not.toHaveBeenCalled();
      expect(screen.getByRole("alertdialog")).toBeTruthy();
    });

    it("reminds that a Facebook post stays there, only when it was posted", () => {
      const first = renderDetail("available", true);
      open();
      expect(screen.getByText(messages.detail.deleteBodyFacebook)).toBeTruthy();
      first.unmount();
      renderDetail("available", false);
      open();
      expect(screen.getByText(messages.detail.deleteBody)).toBeTruthy();
    });
  });

  describe("showing the price to customers", () => {
    const toggle = () => screen.getByRole<HTMLInputElement>("switch", { name: messages.detail.showPricePublic });

    it("is off by default and says so", () => {
      renderDetail("available", false, false, "80000");
      expect(toggle().checked).toBe(false);
      expect(screen.getByText(messages.detail.showPricePublicHint)).toBeTruthy();
    });

    it("cannot be turned on while there is no price, and says why", () => {
      renderDetail();
      expect(toggle().disabled).toBe(true);
      expect(screen.getByText(messages.detail.showPriceNeedsPrice)).toBeTruthy();
    });

    it("can be turned on once a price is typed", () => {
      renderDetail();
      fireEvent.change(screen.getByLabelText(messages.capture.fields.price), { target: { value: "80000" } });
      expect(toggle().disabled).toBe(false);
      expect(screen.queryByText(messages.detail.showPriceNeedsPrice)).toBeNull();
    });

    it("saves the choice and shows it as on", async () => {
      actions.setPricePublicAction.mockResolvedValue({ ok: true });
      renderDetail("available", false, false, "80000");
      fireEvent.click(toggle());
      await waitFor(() => {
        expect(toggle().checked).toBe(true);
      });
      expect(actions.setPricePublicAction).toHaveBeenCalledWith({ recordId: "r1", show: true });
    });

    it("turns it back off", async () => {
      actions.setPricePublicAction.mockResolvedValue({ ok: true });
      renderDetail("available", false, true, "80000");
      expect(toggle().checked).toBe(true);
      fireEvent.click(toggle());
      await waitFor(() => {
        expect(toggle().checked).toBe(false);
      });
      expect(actions.setPricePublicAction).toHaveBeenCalledWith({ recordId: "r1", show: false });
    });

    it("goes back to the old choice and explains when it could not be saved", async () => {
      actions.setPricePublicAction.mockResolvedValue({ ok: false, reason: "failed" });
      renderDetail("available", false, false, "80000");
      fireEvent.click(toggle());
      await waitFor(() => {
        expect(screen.getByText(messages.detail.pricePublicError)).toBeTruthy();
      });
      expect(toggle().checked).toBe(false);
    });
  });

  describe("the link to the public page", () => {
    it("is there for a record customers can see", () => {
      renderDetail("available");
      expect(screen.getByRole("link", { name: messages.detail.seePublic }).getAttribute("href")).toBe("/disco/r1");
    });

    it("is there for a sold record too, and not for a draft", () => {
      const sold = renderDetail("sold");
      expect(screen.getByRole("link", { name: messages.detail.seePublic })).toBeTruthy();
      sold.unmount();
      renderDetail("draft");
      expect(screen.queryByRole("link", { name: messages.detail.seePublic })).toBeNull();
    });
  });
});

