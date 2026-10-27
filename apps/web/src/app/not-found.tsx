import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="font-display text-3xl font-extrabold">{t("title")}</h1>
      <p className="text-lg">{t("body")}</p>
      <Link href="/" className="flex h-14 items-center justify-center rounded-2xl bg-ink text-lg font-bold text-accent-ink">
        {t("back")}
      </Link>
    </main>
  );
}
