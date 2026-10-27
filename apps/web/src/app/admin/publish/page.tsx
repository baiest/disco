import { buildFacebookPost } from "@disco/domain";
import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FacebookComposer } from "@/components/facebook-composer";
import { checkBatch, MAX_POST_MEDIA, parseIds } from "@/lib/facebook-post";
import { loadPostItems, searchInventory } from "@/server/records-repo";
import { createSupabaseServerClient } from "@/server/supabase/server";

type Props = { searchParams: Promise<{ ids?: string | string[] }> };

export default async function PublishPage({ searchParams }: Props) {
  const ids = parseIds((await searchParams).ids);
  const [supabase, t, format] = await Promise.all([createSupabaseServerClient(), getTranslations("publish"), getFormatter()]);
  const { data } = await supabase.auth.getUser();
  if (data.user === null) {
    redirect("/login");
  }

  const header = (
    <header className="flex items-center gap-1">
      <Link href="/admin" aria-label={t("back")} className="flex size-12 items-center justify-center text-2xl font-bold">
        ←
      </Link>
      <h1 className="font-display text-2xl font-extrabold">{t("title")}</h1>
    </header>
  );

  if (ids.length === 0) {
    const rows = (await searchInventory({ query: "", filter: "available" })) ?? [];
    const rank = (row: (typeof rows)[number]) => (row.facebook_posted_at === null ? 0 : row.facebook_needs_update ? 1 : 2);
    const sorted = [...rows].sort((a, b) => rank(a) - rank(b));
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-28 pt-3">
        {header}
        <h2 className="text-lg font-bold">{t("selectTitle")}</h2>
        <p className="text-sm text-muted">{t("selectHint", { max: MAX_POST_MEDIA })}</p>
        {sorted.length === 0 ? (
          <p className="text-base">{t("selectEmpty")}</p>
        ) : (
          <form action="/admin/publish" method="get" className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {sorted.map((row) => (
                <li key={row.id}>
                  <label className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-card px-4 py-2">
                    <input type="checkbox" name="ids" value={row.id} className="size-6 accent-accent" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-base font-bold">{row.title ?? t("untitled")}</span>
                      <span className="text-sm text-muted">
                        {t("files", { count: row.media_count })} ·{" "}
                        {row.facebook_posted_at === null
                          ? t("state.never")
                          : row.facebook_needs_update
                            ? t("state.needsUpdate")
                            : t("state.posted", {
                                date: format.dateTime(new Date(row.facebook_posted_at), { day: "numeric", month: "short" }),
                              })}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper px-4 pb-5 pt-3">
              <button type="submit" className="h-14 w-full rounded-2xl bg-accent text-lg font-bold text-accent-ink">
                {t("prepare")}
              </button>
            </div>
          </form>
        )}
      </main>
    );
  }

  const items = await loadPostItems(ids);
  const media = items.flatMap((item) => item.media);
  const check = checkBatch(items.map((item) => ({ mediaCount: item.media.length })));
  const problem =
    items.length === 0
      ? t("notFound")
      : !check.ok
        ? check.reason === "empty"
          ? t("noFiles")
          : t("tooMany", { total: check.total, max: MAX_POST_MEDIA })
        : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-3">
      {header}
      {problem !== null || items.length === 0 ? (
        <>
          <p role="alert" className="text-base font-bold text-danger">
            {problem}
          </p>
          <Link href="/admin/publish" className="flex h-14 items-center justify-center rounded-2xl border-2 border-ink text-base font-bold">
            {t("chooseAgain")}
          </Link>
        </>
      ) : (
        <FacebookComposer
          recordIds={items.map((item) => item.record.id)}
          media={media}
          initialText={
            items.length === 1 && items[0] !== undefined
              ? buildFacebookPost(items[0].record, { available: t("availableLabel"), sold: t("soldLabel") })
              : ""
          }
        />
      )}
    </main>
  );
}
