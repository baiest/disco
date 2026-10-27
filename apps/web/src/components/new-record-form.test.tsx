import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/es.json";

const actions = vi.hoisted(() => ({
  saveRecordAction: vi.fn(),
  requestUploadAction: vi.fn(),
  registerMediaAction: vi.fn(),
  removeMediaAction: vi.fn(),
  loadDraftMediaAction: vi.fn(),
}));
const push = vi.hoisted(() => vi.fn());

vi.mock("@/app/admin/records/new/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/browser-media", () => ({
  preparePhoto: vi.fn(() =>
    Promise.resolve({ blob: new Blob(["x"]), contentType: "image/jpeg", sizeBytes: 1 }),
  ),
  sendToSignedUrl: vi.fn(() => Promise.resolve({ ok: true })),
}));

import { NewRecordForm } from "./new-record-form";

function renderForm() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <NewRecordForm apiKey="key" />
    </NextIntlClientProvider>,
  );
}

function saveButton() {
  return screen.getByRole<HTMLButtonElement>("button", { name: messages.capture.saveAndNext });
}

function pickPhoto() {
  const input = document.querySelector<HTMLInputElement>('input[accept="image/*,video/*"]');
  const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
  fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });
}

beforeEach(() => {
  localStorage.clear();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  actions.saveRecordAction.mockResolvedValue({ ok: true });
  actions.requestUploadAction.mockResolvedValue({
    ok: true,
    upload: { path: "p", signedUrl: "https://s/u", position: 0, kind: "photo", durationSeconds: null },
  });
  actions.registerMediaAction.mockResolvedValue({ ok: true, position: 0 });
  actions.removeMediaAction.mockResolvedValue({ ok: true });
  actions.loadDraftMediaAction.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NewRecordForm", () => {
  it("cannot be saved without a photo or video", () => {
    renderForm();
    expect(saveButton().disabled).toBe(true);
    expect(screen.getByText(messages.capture.needMedia)).toBeTruthy();
  });

  it("creates the draft first, uploads, and then lets the record be saved", async () => {
    renderForm();
    pickPhoto();
    await waitFor(() => {
      expect(saveButton().disabled).toBe(false);
    });
    expect(actions.saveRecordAction.mock.invocationCallOrder[0]).toBeLessThan(
      actions.requestUploadAction.mock.invocationCallOrder[0] ?? 0,
    );
    fireEvent.change(screen.getByLabelText(messages.capture.fields.title), { target: { value: "Ritmo" } });
    fireEvent.click(saveButton());
    await waitFor(() => {
      expect(screen.getByText(messages.capture.saved)).toBeTruthy();
    });
    expect(actions.saveRecordAction).toHaveBeenLastCalledWith({
      recordId: expect.any(String) as string,
      publish: true,
      input: { title: "Ritmo", artist: "", priceText: "", notes: "" },
    });
    expect(localStorage.getItem("disco:draft")).toBeNull();
    const link = screen.getByRole("link", { name: /Publicar este disco en Facebook/ });
    expect(link.getAttribute("href")).toMatch(/^\/admin\/publish\?ids=[0-9a-f-]{36}$/);
  });

  it("shows a retry button when an upload fails and lets the file be removed", async () => {
    actions.registerMediaAction.mockResolvedValue({ ok: false, reason: "not_uploaded" });
    renderForm();
    pickPhoto();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: messages.capture.retryMedia })).toBeTruthy();
    });
    expect(saveButton().disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: messages.capture.removeMedia }));
    expect(screen.queryByRole("button", { name: messages.capture.retryMedia })).toBeNull();
  });

  it("keeps what was typed and restores it after a reload", () => {
    const first = renderForm();
    fireEvent.change(screen.getByLabelText(messages.capture.fields.artist), { target: { value: "Candita" } });
    first.unmount();
    renderForm();
    expect(screen.getByLabelText<HTMLInputElement>(messages.capture.fields.artist).value).toBe("Candita");
    expect(screen.getByText(messages.capture.restored)).toBeTruthy();
  });

  it("explains a price it cannot read instead of saving", async () => {
    renderForm();
    pickPhoto();
    await waitFor(() => {
      expect(saveButton().disabled).toBe(false);
    });
    fireEvent.change(screen.getByLabelText(messages.capture.fields.price), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: messages.capture.saveAndNext }));
    await waitFor(() => {
      expect(screen.getByText(messages.capture.fieldError.invalid_price)).toBeTruthy();
    });
    expect(actions.saveRecordAction).toHaveBeenCalledTimes(1);
  });

  it("reads a video's length from its preview and uploads it", async () => {
    actions.requestUploadAction.mockResolvedValue({
      ok: true,
      upload: { path: "p", signedUrl: "https://s/u", position: 0, kind: "video", durationSeconds: 30 },
    });
    renderForm();
    const input = document.querySelector<HTMLInputElement>('input[accept="image/*,video/*"]');
    const file = new File(["x"], "clip.mp4", { type: "video/mp4" });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });
    const video = await waitFor(() => {
      const found = document.querySelector("video");
      expect(found).not.toBeNull();
      return found as HTMLVideoElement;
    });
    Object.defineProperty(video, "duration", { value: 30 });
    fireEvent.loadedMetadata(video);
    await waitFor(() => {
      expect(saveButton().disabled).toBe(false);
    });
    expect(actions.requestUploadAction).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "video/mp4", durationSeconds: 30 }),
    );
  });

  it("refuses a video longer than two minutes", async () => {
    renderForm();
    const input = document.querySelector<HTMLInputElement>('input[accept="image/*,video/*"]');
    const file = new File(["x"], "clip.mp4", { type: "video/mp4" });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });
    const video = await waitFor(() => {
      const found = document.querySelector("video");
      expect(found).not.toBeNull();
      return found as HTMLVideoElement;
    });
    Object.defineProperty(video, "duration", { value: 300 });
    fireEvent.loadedMetadata(video);
    await waitFor(() => {
      expect(screen.getByText(messages.capture.failure.too_long)).toBeTruthy();
    });
    expect(actions.requestUploadAction).not.toHaveBeenCalled();
  });

  it("saves as a draft and goes back to the start", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: messages.capture.saveDraftAndExit }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/admin");
    });
    expect(actions.saveRecordAction).toHaveBeenCalledWith(expect.objectContaining({ publish: false }));
  });

  describe("taking a file off the record", () => {
    const removeButton = () => screen.getByRole<HTMLButtonElement>("button", { name: messages.capture.removeMedia });

    it("deletes a file that already uploaded, from the server too", async () => {
      renderForm();
      pickPhoto();
      await waitFor(() => {
        expect(saveButton().disabled).toBe(false);
      });
      fireEvent.click(removeButton());
      await waitFor(() => {
        expect(screen.queryByRole("button", { name: messages.capture.removeMedia })).toBeNull();
      });
      expect(actions.removeMediaAction).toHaveBeenCalledWith({ recordId: expect.any(String) as string, mediaId: expect.any(String) as string });
      expect(saveButton().disabled).toBe(true);
    });

    it("keeps the file and explains when it could not be deleted", async () => {
      actions.removeMediaAction.mockResolvedValue({ ok: false, reason: "failed" });
      renderForm();
      pickPhoto();
      await waitFor(() => {
        expect(saveButton().disabled).toBe(false);
      });
      fireEvent.click(removeButton());
      await waitFor(() => {
        expect(screen.getByText(messages.capture.removeError.failed)).toBeTruthy();
      });
      expect(removeButton()).toBeTruthy();
    });

    it("does not call the server for a file that never uploaded", async () => {
      actions.registerMediaAction.mockResolvedValue({ ok: false, reason: "not_uploaded" });
      renderForm();
      pickPhoto();
      await waitFor(() => {
        expect(screen.getByRole("button", { name: messages.capture.retryMedia })).toBeTruthy();
      });
      fireEvent.click(removeButton());
      expect(screen.queryByRole("button", { name: messages.capture.removeMedia })).toBeNull();
      expect(actions.removeMediaAction).not.toHaveBeenCalled();
    });

    it("deletes a file removed while it was still uploading, once it lands", async () => {
      let finish: (value: { ok: true; position: number }) => void = () => undefined;
      actions.registerMediaAction.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
      renderForm();
      pickPhoto();
      await waitFor(() => {
        expect(actions.registerMediaAction).toHaveBeenCalled();
      });
      fireEvent.click(removeButton());
      expect(screen.queryByRole("button", { name: messages.capture.removeMedia })).toBeNull();
      expect(actions.removeMediaAction).not.toHaveBeenCalled();
      finish({ ok: true, position: 0 });
      await waitFor(() => {
        expect(actions.removeMediaAction).toHaveBeenCalledTimes(1);
      });
    });
  });

  it("shows again the files uploaded before the page was reloaded", async () => {
    localStorage.setItem(
      "disco:draft",
      JSON.stringify({ recordId: "3f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f", fields: { title: "Ritmo", artist: "", priceText: "", notes: "" } }),
    );
    actions.loadDraftMediaAction.mockResolvedValue([{ id: "m1", kind: "photo", url: "https://s/m1.jpg", position: 0 }]);
    const { container } = renderForm();
    await waitFor(() => {
      expect(container.querySelector("img")?.getAttribute("src")).toBe("https://s/m1.jpg");
    });
    expect(actions.loadDraftMediaAction).toHaveBeenCalledWith("3f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f");
    expect(saveButton().disabled).toBe(false);
  });

  it("asks for nothing when there was no draft", () => {
    renderForm();
    expect(actions.loadDraftMediaAction).not.toHaveBeenCalled();
  });
});
