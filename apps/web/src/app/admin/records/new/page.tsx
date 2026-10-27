import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { NewRecordForm } from "@/components/new-record-form";
import { readSupabaseEnv } from "@/lib/env";

export default async function NewRecordPage() {
  const [t, { key }] = await Promise.all([getTranslations("capture"), Promise.resolve(readSupabaseEnv(process.env))]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-3">
      <header className="flex items-center gap-1">
        <Link href="/admin" aria-label="←" className="flex size-12 items-center justify-center text-2xl font-bold">
          ←
        </Link>
        <h1 className="font-display text-2xl font-extrabold">{t("title")}</h1>
      </header>
      <NewRecordForm apiKey={key} />
    </main>
  );
}
