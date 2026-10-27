"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadBatchSummariesAction } from "@/app/admin/batch-actions";
import { batchTotals } from "@/lib/batch-summary";
import { MAX_POST_MEDIA } from "@/lib/facebook-post";
import type { BatchItemView } from "@/server/records-repo";
import { useBatch } from "./use-batch";

const MAX_MINIATURES = 4;

/**
 * The post being put together: a miniature for each record, how many records and files, and a way to review
 * it (unless the screen has its own button for that). It shows on every admin screen while the batch has something in it.
 */
export function BatchSummaryCard({ showReview = true }: { showReview?: boolean }) {
  const t = useTranslations("publish");
  const { ids, remove } = useBatch();
  const [items, setItems] = useState<BatchItemView[]>([]);
  const key = ids.join(",");

  useEffect(() => {
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    let current = true;
    void loadBatchSummariesAction(ids).then((loaded) => {
      if (!current) {
        return;
      }
      setItems(loaded);
      // A record that was sold or deleted since it was added no longer belongs in the batch.
      const kept = new Set(loaded.map((item) => item.id));
      ids.filter((id) => !kept.has(id)).forEach(remove);
    });
    return () => {
      current = false;
    };
    // The ids are compared by value through `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (ids.length === 0 || items.length === 0) {
    return null;
  }
  const totals = batchTotals(items);
  const shown = items.slice(0, MAX_MINIATURES);

  return (
    <section aria-label={t("batchTitle")} className="flex flex-col gap-3 rounded-3xl border-2 border-accent bg-accent-soft p-4">
      <div className="flex items-center gap-3">
        <ul className="flex -space-x-3">
          {shown.map((item) => (
            <li key={item.id} className="size-12 overflow-hidden rounded-xl border-2 border-card bg-line">
              {item.thumbnailUrl === null ? (
                <svg viewBox="0 0 72 72" aria-hidden="true" className="size-full p-2 text-field">
                  <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="4" />
                  <circle cx="36" cy="36" r="8" fill="currentColor" />
                </svg>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- private signed link, not optimised by Next
                <img src={item.thumbnailUrl} alt="" className="size-full object-cover" />
              )}
            </li>
          ))}
        </ul>
        {items.length > MAX_MINIATURES && <span className="text-sm font-bold">{t("batchMore", { count: items.length - MAX_MINIATURES })}</span>}
      </div>
      <p className="text-base font-bold">{t("batchCount", { records: totals.records, files: totals.files, max: MAX_POST_MEDIA })}</p>
      {totals.over && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t("batchOver", { extra: -totals.left })}
        </p>
      )}
      {showReview && (
        <Link
          href={`/admin/publish?ids=${items.map((item) => item.id).join(",")}`}
          className="flex h-14 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-accent-ink"
        >
          {t("batchReview")}
        </Link>
      )}
    </section>
  );
}
