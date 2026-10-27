import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <svg width="64" height="64" viewBox="0 0 72 72" aria-hidden="true" className="text-field">
        <circle cx="36" cy="36" r="34" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="36" cy="36" r="22" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <circle cx="36" cy="36" r="9" fill="currentColor" />
      </svg>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="text-lg">{t("body")}</p>
      <Link href="/" className="flex h-14 items-center justify-center rounded-2xl bg-ink text-lg font-bold text-accent-ink transition active:scale-[0.98]">
        {t("back")}
      </Link>
    </main>
  );
}
