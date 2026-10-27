import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import type { AlbumCard as Card } from "@/lib/inventory";

const TONES = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", neutral: "bg-line text-muted" } as const;

function RecordIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 72 72" aria-hidden="true" className="text-field">
      <circle cx="36" cy="36" r="34" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="36" cy="36" r="22" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <circle cx="36" cy="36" r="9" fill="currentColor" />
    </svg>
  );
}

/** One album: its picture, title, artist and how many copies are in stock or sold. */
export function AlbumCard({ card, thumbnailUrl }: { card: Card; thumbnailUrl: string | null }) {
  const t = useTranslations("inventory");
  const detail = useTranslations("detail");
  const format = useFormatter();
  const { summary } = card;
  const { available, sold, unavailable, drafts, lastSoldAt } = summary;
  const date = lastSoldAt === null ? "" : format.dateTime(new Date(lastSoldAt), { day: "numeric", month: "short" });

  const chips = [
    available > 0 && { key: "in", tone: TONES.ok, text: t("chip.inStock", { count: available }) },
    sold > 0 && {
      key: "sold",
      tone: available > 0 ? TONES.neutral : TONES.warn,
      text: t(available > 0 ? "chip.sold" : "chip.soldOut", { count: sold, date }),
    },
    unavailable > 0 && { key: "off", tone: TONES.neutral, text: t("chip.unavailable", { count: unavailable }) },
    drafts > 0 && { key: "draft", tone: TONES.neutral, text: t("chip.drafts", { count: drafts }) },
  ].filter((chip) => chip !== false);

  const summaryBlock = (
    <div className="flex items-center gap-3">
      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-line">
        {thumbnailUrl === null ? (
          <RecordIcon />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- private signed link, not optimised by Next
          <img src={thumbnailUrl} alt="" loading="lazy" width={64} height={64} className="size-full object-cover" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-xl font-bold">{summary.title ?? t("untitled")}</span>
        <span className="truncate text-base text-muted">{summary.artist ?? t("unknownArtist")}</span>
      </span>
    </div>
  );

  const chipRow = (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span key={chip.key} className={`rounded-full px-3 py-1.5 text-base font-bold ${chip.tone}`}>
          {chip.text}
        </span>
      ))}
    </div>
  );

  const closeLabel = card.isClose && (
    <span className="self-start rounded-full border-2 border-field px-3 text-sm font-bold text-muted">{t("closeMatch")}</span>
  );

  const [only] = summary.copies;
  if (summary.copies.length === 1 && only !== undefined) {
    return (
      <Link
        href={`/admin/records/${only.id}`}
        className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-4 shadow-[0_1px_2px_rgb(28_25_23/0.05)] transition duration-200 active:scale-[0.99] active:bg-line"
      >
        {closeLabel}
        {summaryBlock}
        {chipRow}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-4 shadow-[0_1px_2px_rgb(28_25_23/0.05)]">
      {closeLabel}
      {summaryBlock}
      {chipRow}
      <ul className="flex flex-col border-t border-line">
        {summary.copies.map((copy, index) => (
          <li key={copy.id} className="border-b border-line last:border-b-0">
            <Link href={`/admin/records/${copy.id}`} className="flex min-h-14 items-center justify-between gap-2 text-base font-bold">
              <span>{t("copy", { number: index + 1, status: detail(`status.${copy.status}`) })}</span>
              <span aria-hidden="true">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
