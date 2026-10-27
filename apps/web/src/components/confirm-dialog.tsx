"use client";

import { useEffect, useId, useRef } from "react";

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
}

/**
 * Asks "are you sure?" before something that is hard to take back. The focus starts on the safe
 * choice, and Escape or a tap outside cancel.
 */
export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel, busy = false, error = null }: Props) {
  const titleId = useId();
  const bodyId = useId();
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancel.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel]);

  return (
    <div
      data-testid="confirm-backdrop"
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 sm:items-center"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="flex w-full max-w-md flex-col gap-4 rounded-3xl bg-card p-6 shadow-xl"
      >
        <h2 id={titleId} className="font-display text-2xl font-extrabold">
          {title}
        </h2>
        <p id={bodyId} className="text-base leading-snug">
          {body}
        </p>
        {error !== null && (
          <p role="alert" className="text-base font-bold text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            ref={cancel}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-14 rounded-2xl bg-ink text-lg font-bold text-accent-ink disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="h-14 rounded-2xl border-2 border-danger text-lg font-bold text-danger disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
