import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buildAlbumCards, FILTERS, parseSearch, type AlbumCard } from "@/lib/inventory";
import { searchInventory } from "@/server/records-repo";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { signOut } from "./actions";

type Props = { searchParams: Promise<{ q?: string | string[]; filter?: string | string[] }> };

export default async function AdminPage({ searchParams }: Props) {
  const search = parseSearch(await searchParams);
  const [supabase, t, format] = await Promise.all([
    createSupabaseServerClient(),
    getTranslations("inventory"),
    getFormatter(),
  ]);
  const { data } = await supabase.auth.getUser();
  if (data.user === null) {
    // The proxy already redirects; this check keeps the page safe on its own.
    redirect("/login");
  }

  const rows = await searchInventory(search);
  const cards = rows === null ? [] : buildAlbumCards(rows);
  const [admin, detail, publish] = await Promise.all([
    getTranslations("admin"),
    getTranslations("detail"),
    getTranslations("publish"),
  ]);
  const shortDate = (iso: string | null) =>
    iso === null ? "" : format.dateTime(new Date(iso), { day: "numeric", month: "short" });

  function chips(card: AlbumCard) {
    const { available, sold, unavailable, drafts, lastSoldAt } = card.summary;
    const date = shortDate(lastSoldAt);
    return [
      available > 0 && { key: "in", tone: "ok", text: t("chip.inStock", { count: available }) },
      sold > 0 && {
        key: "sold",
        tone: available > 0 ? "neutral" : "warn",
        text: t(available > 0 ? "chip.sold" : "chip.soldOut", { count: sold, date }),
      },
      unavailable > 0 && { key: "off", tone: "neutral", text: t("chip.unavailable", { count: unavailable }) },
      drafts > 0 && { key: "draft", tone: "neutral", text: t("chip.drafts", { count: drafts }) },
    ].filter((chip) => chip !== false);
  }

  const toneClass = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", neutral: "bg-line text-muted" };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-10 pt-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold">{admin("title")}</h1>
        <Link
          href="/admin/records/new"
          className="flex h-12 items-center rounded-2xl bg-accent px-5 text-base font-bold text-accent-ink"
        >
          {admin("addRecord")}
        </Link>
      </header>

      <form action="/admin" method="get" role="search" className="flex gap-2">
        <input type="hidden" name="filter" value={search.filter} />
        <label htmlFor="q" className="sr-only">
          {t("searchLabel")}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={search.query}
          placeholder={t("searchPlaceholder")}
          className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-ink bg-card px-4 text-lg"
        />
        <button type="submit" className="h-14 rounded-2xl bg-ink px-5 text-base font-bold text-accent-ink">
          {t("searchButton")}
        </button>
      </form>

      <nav className="flex flex-wrap gap-2" aria-label={t("searchLabel")}>
        {FILTERS.map((filter) => {
          const href = `/admin?${new URLSearchParams({ ...(search.query === "" ? {} : { q: search.query }), filter })}`;
          const active = filter === search.filter;
          return (
            <Link
              key={filter}
              href={href}
              aria-current={active ? "true" : undefined}
              className={`flex h-11 items-center rounded-full border-2 px-4 text-base font-semibold ${
                active ? "border-ink bg-ink text-accent-ink" : "border-field"
              }`}
            >
              {t(`filters.${filter}`)}
            </Link>
          );
        })}
      </nav>

      {rows === null ? (
        <p role="alert" className="text-base font-bold text-danger">
          {t("loadError")}
        </p>
      ) : (
        <p role="status" className="text-sm font-bold text-muted">
          {cards.length === 0 && search.query === "" && search.filter === "all"
            ? t("empty")
            : t("count", { count: cards.length })}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {cards.map((card) => (
          <li key={card.summary.key} className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-4">
            {card.isClose && (
              <span className="self-start rounded-full border-2 border-field px-3 text-sm font-bold text-muted">
                {t("closeMatch")}
              </span>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-xl font-bold">{card.summary.title ?? t("untitled")}</span>
              <span className="text-base text-muted">{card.summary.artist ?? t("unknownArtist")}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {chips(card).map((chip) => (
                <span key={chip.key} className={`rounded-full px-3 py-1.5 text-base font-bold ${toneClass[chip.tone as keyof typeof toneClass]}`}>
                  {chip.text}
                </span>
              ))}
            </div>
            <ul className="flex flex-col border-t border-line">
              {card.summary.copies.map((copy, index) => (
                <li key={copy.id} className="border-b border-line last:border-b-0">
                  <Link href={`/admin/records/${copy.id}`} className="flex min-h-14 items-center justify-between gap-2 text-base font-bold">
                    {t("copy", { number: index + 1, status: detail(`status.${copy.status}`) })}
                    <span aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
            </ul>
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

      <Link
        href="/admin/publish"
        className="flex h-14 items-center justify-center rounded-2xl border-2 border-ink text-base font-bold"
      >
        {publish("title")}
      </Link>

      <form action={signOut} className="mt-4">
        <button type="submit" className="h-12 w-full text-base font-semibold underline underline-offset-4">
          {admin("signOut")}
        </button>
      </form>
    </main>
  );
}
