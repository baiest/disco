"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useBatch } from "./use-batch";

/** The button on a record that adds it to, or takes it out of, the Facebook post being put together. */
export function BatchToggle({ recordId }: { recordId: string }) {
  const t = useTranslations("detail");
  const { ids, add, remove } = useBatch();
  const inBatch = ids.includes(recordId);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-pressed={inBatch}
        onClick={() => {
          if (inBatch) {
            remove(recordId);
          } else {
            add(recordId);
          }
        }}
        className={`h-14 rounded-2xl border-2 text-lg font-bold ${
          inBatch ? "border-accent bg-accent-soft text-accent" : "border-accent bg-accent text-accent-ink"
        }`}
      >
        {inBatch ? t("batchRemove") : t("batchAdd")}
      </button>
      {inBatch && (
        <Link href={`/admin/publish?ids=${ids.join(",")}`} className="flex h-12 items-center text-base font-bold underline underline-offset-4">
          {t("batchReview")}
        </Link>
      )}
    </div>
  );
}
