import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="¿Eliminar este disco?"
      body="Va a desaparecer de tus listas."
      confirmLabel="Sí, eliminar"
      cancelLabel="No, conservarlo"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
}

afterEach(cleanup);

describe("ConfirmDialog", () => {
  it("is an alert dialog with its title and explanation", () => {
    renderDialog();
    const dialog = screen.getByRole("alertdialog", { name: "¿Eliminar este disco?" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).not.toBeNull();
    expect(screen.getByText("Va a desaparecer de tus listas.")).toBeTruthy();
  });

  it("puts the focus on the safe choice, so a stray tap does not delete", () => {
    renderDialog();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "No, conservarlo" }));
  });

  it("confirms only when the confirm button is tapped", () => {
    const { onConfirm, onCancel } = renderDialog();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels with the cancel button, with Escape and by tapping outside", () => {
    const { onConfirm, onCancel } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "No, conservarlo" }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByTestId("confirm-backdrop"));
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not cancel when the tap is inside the dialog", () => {
    const { onCancel } = renderDialog();
    fireEvent.click(screen.getByRole("alertdialog"));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("locks both buttons while it works, and shows an error", () => {
    const { onConfirm } = renderDialog({ busy: true, error: "No se pudo eliminar." });
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Sí, eliminar" }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "No, conservarlo" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("No se pudo eliminar.");
  });
});
