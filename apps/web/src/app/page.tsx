import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PublicCard } from "@/components/public-card";
import { parsePublicQuery } from "@/lib/public-catalog";
import { listPublicRecords, signPublicPictures } from "@/server/public-repo";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

/** The catalog a customer sees: no account, no sign in. */
export default async function CatalogPage({ searchParams }: Props) {
  const query = parsePublicQuery(await searchParams);
  const t = await getTranslations("catalog");
  const records = await listPublicRecords(query);
  const list = records ?? [];
  const pictures = await signPublicPictures(list.flatMap((record) => (record.firstMediaPath === null ? [] : [record.firstMediaPath])));

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pb-12 pt-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-extrabold">{t("title")}</h1>
        <p className="text-base text-muted">{t("intro")}</p>
      </header>

      <form action="/" method="get" role="search" className="relative">
        <label htmlFor="q" className="sr-only">
          {t("searchLabel")}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          enterKeyHint="search"
          defaultValue={query}
          placeholder={t("searchPlaceholder")}
          className="h-14 w-full rounded-2xl border-2 border-ink bg-card pl-4 pr-16 text-lg"
        />
        <button type="submit" aria-label={t("searchButton")} className="absolute right-1 top-1 flex size-12 items-center justify-center rounded-xl">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
        </button>
      </form>

      {records === null ? (
        <p role="alert" className="text-base font-bold text-danger">
          {t("loadError")}
        </p>
      ) : list.length === 0 ? (
        <div role="status" className="flex flex-col gap-2 rounded-3xl border-2 border-dashed border-field bg-card p-6 text-center">
          <p className="text-lg font-bold">{query === "" ? t("empty") : t("noResults", { query })}</p>
          {query !== "" && (
            <Link href="/" className="mx-auto flex h-12 items-center text-base font-bold underline underline-offset-4">
              {t("clearSearch")}
            </Link>
          )}
        </div>
      ) : (
        <>
          <p role="status" className="text-sm font-bold text-muted">
            {t("count", { count: list.length })}
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((record) => (
              <li key={record.id} className="flex">
                <PublicCard
                  record={record}
                  pictureUrl={record.firstMediaPath === null ? null : (pictures.get(record.firstMediaPath) ?? null)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
