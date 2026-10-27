import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { AlbumCard } from "@/components/album-card";
import { BatchSummaryCard } from "@/components/batch-summary-card";
import { BottomBar } from "@/components/bottom-bar";
import { DeletedNotice } from "@/components/deleted-notice";
import { EmptyResults } from "@/components/empty-results";
import { InstallHint } from "@/components/install-hint";
import { buildAlbumCards, FILTERS, parseSearch } from "@/lib/inventory";
import { parseIds } from "@/lib/facebook-post";
import { countUnposted, isRecordDeleted, searchInventory, signThumbnails } from "@/server/records-repo";
import { getCurrentUserId } from "@/server/supabase/current-user";

type Props = { searchParams: Promise<{ q?: string | string[]; filter?: string | string[]; undo?: string | string[] }> };

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = parseSearch(params);
  const [t, admin] = await Promise.all([getTranslations("inventory"), getTranslations("admin")]);
  if ((await getCurrentUserId()) === null) {
    // The proxy already redirects; this check keeps the page safe on its own.
    redirect("/login");
  }

  const isPlainList = search.query === "" && search.filter === "all";
  const undoId = parseIds(params.undo)[0];
  const [rows, unposted, deleted] = await Promise.all([
    searchInventory(search),
    isPlainList ? countUnposted() : 0,
    undoId === undefined ? false : isRecordDeleted(undoId),
  ]);
  const cards = rows === null ? [] : buildAlbumCards(rows);
  const pictures = await signThumbnails(cards.flatMap((card) => (card.thumbnailPath === null ? [] : [card.thumbnailPath])));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-32 pt-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold">{admin("title")}</h1>
        <AccountMenu />
      </header>

      <InstallHint />

      {undoId !== undefined && deleted && <DeletedNotice recordId={undoId} />}

      <BatchSummaryCard />

      <form action="/admin" method="get" role="search" className="relative">
        <input type="hidden" name="filter" value={search.filter} />
        <label htmlFor="q" className="sr-only">
          {t("searchLabel")}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          enterKeyHint="search"
          defaultValue={search.query}
          placeholder={t("searchPlaceholder")}
          className="h-14 w-full rounded-2xl border-2 border-ink bg-card pl-4 pr-16 text-lg"
        />
        <button
          type="submit"
          aria-label={t("searchButton")}
          className="absolute right-1 top-1 flex size-12 items-center justify-center rounded-xl text-ink"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
        </button>
      </form>

      <nav aria-label={t("searchLabel")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {FILTERS.map((filter) => {
          const href = `/admin?${new URLSearchParams({ ...(search.query === "" ? {} : { q: search.query }), filter })}`;
          const active = filter === search.filter;
          return (
            <Link
              key={filter}
              href={href}
              aria-current={active ? "true" : undefined}
              className={`flex h-11 shrink-0 items-center whitespace-nowrap rounded-full border-2 px-4 text-base font-semibold ${
                active ? "border-ink bg-ink text-accent-ink" : "border-field"
              }`}
            >
              {t(`filters.${filter}`)}
            </Link>
          );
        })}
      </nav>

      {unposted > 0 && (
        <Link
          href="/admin/publish"
          className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border-2 border-accent bg-accent-soft px-4 py-3"
        >
          <span className="text-base font-bold">{t("publishBanner", { count: unposted })}</span>
          <span className="shrink-0 text-base font-bold text-accent underline underline-offset-4">{t("publishBannerAction")}</span>
        </Link>
      )}

      {rows === null ? (
        <p role="alert" className="text-base font-bold text-danger">
          {t("loadError")}
        </p>
      ) : cards.length === 0 && isPlainList ? (
        <p role="status" className="py-8 text-center text-lg text-muted">
          {t("empty")}
        </p>
      ) : cards.length === 0 ? (
        <EmptyResults query={search.query} filter={search.filter} />
      ) : (
        <p role="status" className="text-sm font-bold text-muted">
          {t("count", { count: cards.length })}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {cards.map((card) => (
          <li key={card.summary.key}>
            <AlbumCard card={card} thumbnailUrl={card.thumbnailPath === null ? null : (pictures.get(card.thumbnailPath) ?? null)} />
          </li>
        ))}
      </ul>

      {search.query !== "" && (
        <Link
          href="/admin/records/new"
          className="flex h-14 items-center justify-center rounded-2xl border-2 border-ink text-base font-bold"
        >
          {t("addNone")}
        </Link>
      )}

      <BottomBar>
        <Link
          href="/admin/records/new"
          className="mx-auto flex h-16 max-w-md items-center justify-center gap-2 rounded-2xl bg-accent text-xl font-bold text-accent-ink"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {admin("addRecord")}
        </Link>
      </BottomBar>
    </main>
  );
}
