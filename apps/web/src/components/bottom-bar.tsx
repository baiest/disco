"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isKeyboardOpen } from "@/lib/keyboard";

/** True while the on screen keyboard is covering part of the page. */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Older browsers have no visual viewport, although the type says it is always there.
    const viewport = window.visualViewport as VisualViewport | null | undefined;
    if (viewport === null || viewport === undefined) {
      return;
    }
    let baselineHeight = window.innerHeight;
    let width = window.innerWidth;
    const update = () => {
      // Turning the phone changes the full height; start measuring again from there.
      if (window.innerWidth !== width) {
        width = window.innerWidth;
        baselineHeight = window.innerHeight;
      }
      baselineHeight = Math.max(baselineHeight, window.innerHeight);
      setOpen(isKeyboardOpen({ baselineHeight, visibleHeight: viewport.height }));
    };
    viewport.addEventListener("resize", update);
    return () => {
      viewport.removeEventListener("resize", update);
    };
  }, []);

  return open;
}

/**
 * The bar with the main buttons at the bottom of a screen. It stays on screen, except while the keyboard
 * is open: then it moves into the page so it does not sit on top of the keyboard and hide the fields.
 */
export function BottomBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  const keyboardOpen = useKeyboardOpen();
  const placement = keyboardOpen
    ? "mt-4 pb-5"
    : "fixed inset-x-0 bottom-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]";

  return (
    <div data-testid="bottom-bar" className={`${placement} border-t border-line bg-paper px-4 pt-3 ${className}`.trim()}>
      {children}
    </div>
  );
}
