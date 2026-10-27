import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionSheet } from "./action-sheet";

function renderSheet() {
  const onClose = vi.fn();
  const camera = vi.fn();
  const gallery = vi.fn();
  render(
    <ActionSheet
      title="¿Cómo quieres agregarlo?"
      cancelLabel="Cancelar"
      options={[
        { key: "camera", label: "Cámara", onSelect: camera },
        { key: "gallery", label: "Galería", onSelect: gallery },
      ]}
      onClose={onClose}
    />,
  );
  return { onClose, camera, gallery };
}

afterEach(cleanup);

describe("ActionSheet", () => {
  it("is a dialog with its title and one button per option", () => {
    renderSheet();
    const dialog = screen.getByRole("dialog", { name: "¿Cómo quieres agregarlo?" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("button", { name: "Cámara" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Galería" })).toBeTruthy();
  });

  it("runs the chosen option and closes", () => {
    const { onClose, camera, gallery } = renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Galería" }));
    expect(gallery).toHaveBeenCalledTimes(1);
    expect(camera).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes without running anything on Cancel, Escape or a tap outside", () => {
    const { onClose, camera, gallery } = renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByTestId("sheet-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(camera).not.toHaveBeenCalled();
    expect(gallery).not.toHaveBeenCalled();
  });

  it("does not close when the tap is inside the sheet", () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
