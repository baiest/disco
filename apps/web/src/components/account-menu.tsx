"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/admin/actions";

/** The hamburger button at the top right: what is not needed every day lives here. */
export function AccountMenu() {
  const t = useTranslations("admin");
  const publish = useTranslations("publish");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (root.current !== null && event.target instanceof Node && !root.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const item = "flex h-14 w-full items-center px-5 text-left text-lg font-bold";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={t("menuLabel")}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setOpen(!open);
        }}
        className="flex size-12 items-center justify-center rounded-2xl border-2 border-ink"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-14 z-20 w-64 overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-lg">
          <Link
            href="/admin/publish"
            onClick={() => {
              setOpen(false);
            }}
            className={`${item} border-b border-line`}
          >
            {publish("title")}
          </Link>
          <form action={signOut}>
            <button type="submit" className={item}>
              {t("signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
