"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import { batchTotals } from "@/lib/batch-summary";
import { recordHref } from "@/lib/back-target";
import { MAX_POST_MEDIA } from "@/lib/facebook-post";
import type { MediaLink } from "@/lib/share-media";
import { FacebookComposer } from "./facebook-composer";
import { PublishHeader } from "./publish-header";
import { useBatch } from "./use-batch";

export interface ReviewItem {
  id: string;
  title: string | null;
  artist: string | null;
  thumbnailUrl: string | null;
  media: MediaLink[];
}

/**
 * The last look before posting: every record of the batch in a row, each one with Edit and Remove, how much
 * the post holds, and then the steps to publish. Taking a record out here takes it out of the batch too.
 */
export function PublishReview({ items: initialItems, initialText }: { items: ReviewItem[]; initialText: string }) {
  const t = useTranslations("publish");
  const { remove } = useBatch();
  const [items, setItems] = useState(initialItems);
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);
  const media = useMemo(() => items.flatMap((item) => item.media), [items]);
  const postIds = items.map((item) => item.id);
  const totals = batchTotals(items.map((item) => ({ mediaCount: item.media.length })));

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PublishHeader />
        <p role="status" className="text-lg font-bold">
          {t("emptyBatch")}
        </p>
        <Link href="/admin/publish" className="flex h-14 items-center justify-center rounded-2xl border-2 border-ink text-base font-bold">
          {t("pickDiscs")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PublishHeader actionRef={setActionSlot} />
      <section className="flex flex-col gap-3" aria-labelledby="review-title">
        <h2 id="review-title" className="text-lg font-bold">
          {t("reviewTitle")}
        </h2>
        <p className="text-sm text-muted">{t("reviewHint")}</p>
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const name = item.title ?? t("untitled");
            return (
              <li key={item.id} className="relative rounded-2xl border border-line bg-card">
                <Link href={recordHref(item.id, postIds)} className="flex items-center gap-3 p-3 pr-14">
                  <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-line">
                    {item.thumbnailUrl === null ? (
                      <svg viewBox="0 0 72 72" aria-hidden="true" className="size-10 text-field">
                        <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="4" />
                        <circle cx="36" cy="36" r="8" fill="currentColor" />
                      </svg>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- private signed link, not optimised by Next
                      <img src={item.thumbnailUrl} alt="" className="size-full object-cover" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-bold">{name}</span>
                    {item.artist !== null && <span className="truncate text-sm text-muted">{item.artist}</span>}
                    <span className="text-sm text-muted">{t("filesOfRecord", { count: item.media.length })}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label={`${t("removeFromBatch")} ${name}`}
                  onClick={() => {
                    remove(item.id);
                    setItems((current) => current.filter((entry) => entry.id !== item.id));
                  }}
                  className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-xl text-ink"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-base font-bold">{t("batchCount", { records: totals.records, files: totals.files, max: MAX_POST_MEDIA })}</p>
        {totals.over && (
          <p role="alert" className="text-base font-bold text-danger">
            {t("batchOver", { extra: -totals.left })}
          </p>
        )}
        {totals.files === 0 && (
          <p role="alert" className="text-base font-bold text-danger">
            {t("noFiles")}
          </p>
        )}
        <Link
          href="/admin/publish"
          className="flex h-12 items-center justify-center text-base font-bold underline underline-offset-4"
        >
          {t("addMore")}
        </Link>
      </section>

      {!totals.over && totals.files > 0 && <FacebookComposer recordIds={items.map((item) => item.id)} media={media} initialText={initialText} actionSlot={actionSlot} />}
    </div>
  );
}
