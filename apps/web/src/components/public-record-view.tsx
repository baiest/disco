import { useFormatter, useTranslations } from "next-intl";
import type { PublicRecord } from "@/lib/public-catalog";
import type { PublicMedia } from "@/server/public-repo";

interface Props {
  record: PublicRecord;
  media: PublicMedia[];
  /** The WhatsApp chat link, or null when the shop's number is not set. */
  whatsappUrl: string | null;
}

/** One record for a customer: every photo and video, what it is, and how to ask about it. */
export function PublicRecordView({ record, media, whatsappUrl }: Props) {
  const t = useTranslations("catalog");
  const format = useFormatter();
  const sold = record.status === "sold";

  return (
    <article className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {media.map((item) => (
          <li key={item.id} className="overflow-hidden rounded-3xl bg-line">
            {item.kind === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage link, not optimised by Next
              <img src={item.url} alt="" loading="lazy" className="w-full object-cover" />
            ) : (
              <video src={item.url} controls preload="metadata" playsInline aria-label={t("videoLabel")} className="w-full" />
            )}
          </li>
        ))}
      </ul>

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold leading-tight">{record.title ?? t("untitled")}</h1>
        <p className="text-lg text-muted">{record.artist ?? t("unknownArtist")}</p>
        {record.priceCop !== null && (
          <p className="text-2xl font-extrabold text-accent">{`$${format.number(record.priceCop, { useGrouping: "always", maximumFractionDigits: 0 })}`}</p>
        )}
      </header>

      {record.notes !== null && <p className="whitespace-pre-line text-lg leading-snug">{record.notes}</p>}

      {sold ? (
        <p className="rounded-2xl bg-line p-4 text-base font-bold">{t("soldNotice")}</p>
      ) : (
        whatsappUrl !== null && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-16 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-accent-ink"
          >
            {t("askWhatsapp")}
          </a>
        )
      )}
    </article>
  );
}
