import { useTranslations } from "next-intl";
import Link from "next/link";
import type { InventoryFilter } from "@/lib/inventory";

/** What the list says when a search or a filter finds nothing, so it is not mistaken for an empty store. */
export function EmptyResults({ query, filter }: { query: string; filter: InventoryFilter }) {
  const t = useTranslations("inventory");

  return (
    <div role="status" className="flex flex-col gap-2 rounded-3xl border-2 border-dashed border-field bg-card p-6 text-center">
      <p className="font-display text-xl font-bold">{query === "" ? t("noResultsFilter") : t("noResultsQuery", { query })}</p>
      <p className="text-base text-muted">{t("noResultsHint")}</p>
      {filter !== "all" && (
        <Link
          href={`/admin${query === "" ? "" : `?${new URLSearchParams({ q: query })}`}`}
          className="mx-auto flex h-12 items-center text-base font-bold underline underline-offset-4"
        >
          {t("noResultsAll")}
        </Link>
      )}
    </div>
  );
}
