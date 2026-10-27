import { useTranslations } from "next-intl";
import Link from "next/link";
import { restoreRecordAction } from "@/app/admin/actions";

/** Shown on the list right after a record was deleted, so it can be brought back with one tap. */
export function DeletedNotice({ recordId }: { recordId: string }) {
  const t = useTranslations("inventory");

  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-accent-ink">
      <span className="text-base font-bold">{t("deletedNotice")}</span>
      <div className="flex items-center gap-1">
        <form action={restoreRecordAction}>
          <input type="hidden" name="id" value={recordId} />
          <button type="submit" className="h-12 rounded-xl px-3 text-base font-bold underline underline-offset-4">
            {t("deletedUndo")}
          </button>
        </form>
        <Link href="/admin" aria-label={t("deletedDismiss")} className="flex size-12 items-center justify-center text-xl font-bold">
          ×
        </Link>
      </div>
    </div>
  );
}
