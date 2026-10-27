import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import messages from "../../messages/es.json";
import { notifyBatchChanged } from "@/lib/batch-storage";
import { BatchToggle } from "./batch-toggle";

function renderToggle(recordId = "r1") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <BatchToggle recordId={recordId} />
    </NextIntlClientProvider>,
  );
}

const button = (name: string) => screen.getByRole<HTMLButtonElement>("button", { name });

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

describe("BatchToggle", () => {
  it("offers to add a record that is not in the batch", () => {
    renderToggle();
    expect(button(messages.detail.batchAdd).getAttribute("aria-pressed")).toBe("false");
  });

  it("adds it, then offers to take it out", () => {
    renderToggle();
    fireEvent.click(button(messages.detail.batchAdd));
    expect(JSON.parse(localStorage.getItem("disco:batch") ?? "[]")).toEqual(["r1"]);
    expect(button(messages.detail.batchRemove).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button(messages.detail.batchRemove));
    expect(localStorage.getItem("disco:batch")).toBeNull();
    expect(button(messages.detail.batchAdd)).toBeTruthy();
  });

  it("starts as 'in the batch' when the record already is, and offers to review", () => {
    localStorage.setItem("disco:batch", JSON.stringify(["r1", "r2"]));
    renderToggle();
    expect(button(messages.detail.batchRemove)).toBeTruthy();
    expect(screen.getByRole("link", { name: messages.detail.batchReview }).getAttribute("href")).toBe("/admin/publish?ids=r1,r2");
  });

  it("does not offer to review a batch that has not got this record", () => {
    renderToggle();
    expect(screen.queryByRole("link", { name: messages.detail.batchReview })).toBeNull();
  });

  it("follows changes made elsewhere on the page", () => {
    renderToggle();
    act(() => {
      localStorage.setItem("disco:batch", JSON.stringify(["r1"]));
      notifyBatchChanged();
    });
    expect(button(messages.detail.batchRemove)).toBeTruthy();
  });
});
