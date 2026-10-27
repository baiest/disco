import { useTranslations } from "next-intl";
import Link from "next/link";
import type { Ref } from "react";

/** Title of the publish screens with a way back; `actionRef` marks the spot at the right for the main button. */
export function PublishHeader({ actionRef }: { actionRef?: Ref<HTMLDivElement> }) {
  const t = useTranslations("publish");
  return (
    <header className="flex items-center gap-1">
      <Link href="/admin" aria-label={t("back")} className="flex size-12 shrink-0 items-center justify-center text-2xl font-bold">
        ←
      </Link>
      <h1 className="min-w-0 flex-1 font-display text-xl font-extrabold leading-tight">{t("title")}</h1>
      <div ref={actionRef} className="shrink-0" />
    </header>
  );
}
