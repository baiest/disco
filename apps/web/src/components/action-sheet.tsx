"use client";

import { useEffect, useId, useRef } from "react";

export interface SheetOption {
  key: string;
  label: string;
  onSelect: () => void;
}

interface Props {
  title: string;
  options: SheetOption[];
  cancelLabel: string;
  onClose: () => void;
}

/** A panel that slides up from the bottom of the screen to ask "which one?", with big buttons for a phone. */
export function ActionSheet({ title, options, cancelLabel, onClose }: Props) {
  const titleId = useId();
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    first.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div data-testid="sheet-backdrop" onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="flex w-full max-w-md flex-col gap-3 rounded-t-3xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl"
      >
        <h2 id={titleId} className="font-display text-xl font-extrabold">
          {title}
        </h2>
        {options.map((option, index) => (
          <button
            key={option.key}
            ref={index === 0 ? first : undefined}
            type="button"
            onClick={() => {
              onClose();
              option.onSelect();
            }}
            className="h-16 rounded-2xl border-2 border-ink text-lg font-bold active:bg-line"
          >
            {option.label}
          </button>
        ))}
        <button type="button" onClick={onClose} className="h-12 text-base font-bold underline underline-offset-4">
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
