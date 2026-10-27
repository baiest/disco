import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RecordDetail } from "@/components/record-detail";
import { loadRecordDetail } from "@/server/records-repo";
import { getCurrentUserId } from "@/server/supabase/current-user";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) {
    notFound();
  }
  const [t, format] = await Promise.all([getTranslations("detail"), getFormatter()]);
  if ((await getCurrentUserId()) === null) {
    redirect("/login");
  }
  const detail = await loadRecordDetail(id);
  if (detail === null) {
    notFound();
  }
  const { record, media, showPricePublic } = detail;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-3">
      <header className="flex items-center gap-1">
        <Link href="/admin" aria-label={t("back")} className="flex size-12 items-center justify-center text-2xl font-bold">
          ←
        </Link>
        <h1 className="font-display text-2xl font-extrabold">{record.title ?? t("untitled")}</h1>
      </header>
      <RecordDetail
        recordId={record.id}
        initialStatus={record.status}
        initialFields={{
          title: record.title ?? "",
          artist: record.artist ?? "",
          priceText: record.priceCop === null ? "" : String(record.priceCop),
          notes: record.notes ?? "",
        }}
        soldOn={record.soldAt === null ? null : format.dateTime(new Date(record.soldAt), { day: "numeric", month: "short" })}
        media={media}
        postedOnFacebook={record.facebookPostedAt !== null}
        showPricePublic={showPricePublic}
      />
    </main>
  );
}
