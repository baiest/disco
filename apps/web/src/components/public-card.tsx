import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import type { PublicRecord } from "@/lib/public-catalog";

function RecordIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 72 72" aria-hidden="true" className="text-field">
      <circle cx="36" cy="36" r="34" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="36" cy="36" r="22" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <circle cx="36" cy="36" r="9" fill="currentColor" />
    </svg>
  );
}

/** One record in the public list: its picture, title, artist, and the price when the owner chose to show it. */
export function PublicCard({ record, pictureUrl }: { record: PublicRecord; pictureUrl: string | null }) {
  const t = useTranslations("catalog");
  const format = useFormatter();
  const sold = record.status === "sold";

  return (
    <Link href={`/disco/${record.id}`} className="flex size-full flex-col gap-2 rounded-3xl border border-line bg-card p-3 active:bg-line">
      <span className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-line">
        {pictureUrl === null ? (
          <RecordIcon />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage link, not optimised by Next
          <img src={pictureUrl} alt="" loading="lazy" className={`size-full object-cover ${sold ? "opacity-60" : ""}`} />
        )}
        {sold && (
          <span className="absolute left-2 top-2 rounded-full bg-ink px-3 py-1 text-sm font-bold text-accent-ink">{t("sold")}</span>
        )}
      </span>
      {record.isClose && <span className="self-start text-xs font-bold text-muted">{t("closeMatch")}</span>}
      <span className="flex flex-col gap-0.5">
        <span className="line-clamp-2 font-display text-lg font-bold leading-tight">{record.title ?? t("untitled")}</span>
        <span className="truncate text-sm text-muted">{record.artist ?? t("unknownArtist")}</span>
      </span>
      {record.priceCop !== null && (
        <span className="text-base font-extrabold text-accent">{`$${format.number(record.priceCop, { useGrouping: "always", maximumFractionDigits: 0 })}`}</span>
      )}
    </Link>
  );
}
