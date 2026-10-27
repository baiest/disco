import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicRecordView } from "@/components/public-record-view";
import { whatsappHref } from "@/lib/public-catalog";
import { loadPublicRecord } from "@/server/public-repo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The page and its title both need the record; asking twice would be two trips to the database.
const load = cache(loadPublicRecord);

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const detail = UUID.test(id) ? await load(id) : null;
  if (detail === null) {
    return {};
  }
  return { title: detail.record.title ?? "Disco", description: detail.record.artist ?? undefined };
}

export default async function PublicRecordPage({ params }: Props) {
  const { id } = await params;
  if (!UUID.test(id)) {
    notFound();
  }
  const [detail, t] = await Promise.all([load(id), getTranslations("catalog")]);
  if (detail === null) {
    notFound();
  }
  const { record, media } = detail;
  const message = record.title === null ? t("whatsappMessageUntitled") : t("whatsappMessage", { title: record.title });

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pb-12 pt-4">
      <Link href="/" className="flex h-12 items-center text-base font-bold underline underline-offset-4">
        {t("back")}
      </Link>
      <PublicRecordView record={record} media={media} whatsappUrl={whatsappHref(process.env["NEXT_PUBLIC_WHATSAPP_NUMBER"], message)} />
    </main>
  );
}
