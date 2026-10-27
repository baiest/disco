"use client";

import { useTranslations } from "next-intl";
import { MAX_POST_MEDIA } from "@/lib/facebook-post";
import { BatchSummaryCard } from "./batch-summary-card";
import { BottomBar } from "./bottom-bar";
import { EmptyResults } from "./empty-results";
import { useBatch } from "./use-batch";

export interface PickerRow {
  id: string;
  title: string | null;
  files: number;
  /** Already worded, for example "Sin publicar" or "Publicado el 3 oct". */
  state: string;
  thumbnailUrl: string | null;
}

/**
 * Choosing the discs of one Facebook post. The choice lives in the batch kept on the phone, so it survives a
 * new search (a new page), and what is chosen shows above the list even when it is not in the results.
 */
export function PublishPicker({ rows, query }: { rows: PickerRow[]; query: string }) {
  const t = useTranslations("publish");
  const { ids, add, remove } = useBatch();
  const chosen = new Set(ids);
  const ready = ids.length > 0;
  const prepareClass = "flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold";

  return (
    <div className="flex flex-col gap-4 pb-28">
      <form action="/admin/publish" method="get" role="search" className="relative">
        <label htmlFor="publish-q" className="sr-only">
          {t("searchLabel")}
        </label>
        <input
          id="publish-q"
          name="q"
          type="search"
          enterKeyHint="search"
          defaultValue={query}
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

      <BatchSummaryCard showReview={false} />

      <h2 className="text-lg font-bold">{t("selectTitle")}</h2>
      <p className="text-sm text-muted">{t("selectHint", { max: MAX_POST_MEDIA })}</p>

      {rows.length === 0 ? (
        query === "" ? (
          <p className="text-base">{t("selectEmpty")}</p>
        ) : (
          <EmptyResults query={query} filter="all" />
        )
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              <label className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-card px-4 py-2">
                <input
                  type="checkbox"
                  checked={chosen.has(row.id)}
                  onChange={(event) => {
                    (event.target.checked ? add : remove)(row.id);
                  }}
                  className="size-6 shrink-0 accent-accent"
                />
                <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-line">
                  {row.thumbnailUrl === null ? (
                    <svg viewBox="0 0 72 72" aria-hidden="true" className="size-9 text-field">
                      <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="4" />
                      <circle cx="36" cy="36" r="8" fill="currentColor" />
                    </svg>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- private signed link, not optimised by Next
                    <img src={row.thumbnailUrl} alt="" className="size-full object-cover" />
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-bold">{row.title ?? t("untitled")}</span>
                  <span className="text-sm text-muted">
                    {t("files", { count: row.files })} · {row.state}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <BottomBar>
        {ready ? (
          <a href={`/admin/publish?ids=${ids.join(",")}`} className={`${prepareClass} bg-accent text-accent-ink`}>
            {t("prepareCount", { count: ids.length })}
          </a>
        ) : (
          <a role="link" aria-disabled="true" className={`${prepareClass} bg-disabled text-muted`}>
            {t("prepare")}
          </a>
        )}
      </BottomBar>
    </div>
  );
}
