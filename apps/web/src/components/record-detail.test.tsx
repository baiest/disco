import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/es.json";

const actions = vi.hoisted(() => ({
  changeStatusAction: vi.fn(),
  undoStatusAction: vi.fn(),
  saveFieldsAction: vi.fn(),
}));
vi.mock("@/app/admin/records/[id]/actions", () => actions);

import { RecordDetail } from "./record-detail";

const fields = { title: "Ritmo", artist: "", priceText: "", notes: "" };

function renderDetail(status: "draft" | "available" | "sold" = "available") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RecordDetail recordId="r1" initialStatus={status} initialFields={fields} soldOn={null} media={[]} />
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
});
