"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { installHintFor, type InstallHint } from "@/lib/install-hint";

const DISMISSED_KEY = "disco:install-hint-dismissed";

// Storage can be blocked (private windows, site data off); the hint then lasts until the page closes.
let dismissedInMemory = false;
const listeners = new Set<() => void>();

function wasDismissed(): boolean {
  try {
    return dismissedInMemory || window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return dismissedInMemory;
  }
}

function dismiss() {
  dismissedInMemory = true;
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Kept in memory above.
  }
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function currentHint(): InstallHint | null {
  return installHintFor({
    userAgent: window.navigator.userAgent,
    touchPoints: window.navigator.maxTouchPoints,
    installed: window.matchMedia("(display-mode: standalone)").matches,
    dismissed: wasDismissed(),
  });
}

/** Explains how to put the app on the home screen, until it is installed or closed. */
export function InstallHint() {
  const t = useTranslations("install");
  // The server cannot know the device, so it renders nothing and the browser decides.
  const hint = useSyncExternalStore(subscribe, currentHint, () => null);

  if (hint === null) {
    return null;
  }

  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border-2 border-line bg-card px-4 py-3">
      <div className="flex-1">
        <p className="text-base font-bold">{t("title")}</p>
        <p className="mt-1 text-base text-muted">{t(hint)}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="flex h-11 shrink-0 items-center rounded-xl border-2 border-ink px-4 text-base font-bold"
      >
        {t("dismiss")}
      </button>
    </div>
  );
}
