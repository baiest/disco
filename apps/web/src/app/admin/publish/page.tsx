import { buildFacebookPost } from "@disco/domain";
import { getFormatter, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BottomBar } from "@/components/bottom-bar";
import { PublishHeader } from "@/components/publish-header";
import { PublishReview, type ReviewItem } from "@/components/publish-review";
import { MAX_POST_MEDIA, parseIds } from "@/lib/facebook-post";
import { loadPostItems, searchInventory } from "@/server/records-repo";
import { getCurrentUserId } from "@/server/supabase/current-user";

type Props = { searchParams: Promise<{ ids?: string | string[]; keep?: string | string[] }> };

export default async function PublishPage({ searchParams }: Props) {
  const params = await searchParams;
  const ids = parseIds(params.ids);
  const keep = new Set(parseIds(params.keep));
  const [t, format] = await Promise.all([getTranslations("publish"), getFormatter()]);
  if ((await getCurrentUserId()) === null) {
    redirect("/login");
  }

  if (ids.length === 0) {
    const rows = (await searchInventory({ query: "", filter: "available" })) ?? [];
    const rank = (row: (typeof rows)[number]) => (row.facebook_posted_at === null ? 0 : row.facebook_needs_update ? 1 : 2);
    const sorted = [...rows].sort((a, b) => rank(a) - rank(b));
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-28 pt-3">
        <PublishHeader />
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
                    <input type="checkbox" name="ids" value={row.id} defaultChecked={keep.has(row.id)} className="size-6 accent-accent" />
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
            <BottomBar>
              <button type="submit" className="h-14 w-full rounded-2xl bg-accent text-lg font-bold text-accent-ink">
                {t("prepare")}
              </button>
            </BottomBar>
          </form>
        )}
      </main>
    );
  }

  const items = await loadPostItems(ids);
  const reviewItems: ReviewItem[] = items.map((item) => ({
    id: item.record.id,
    title: item.record.title,
    artist: item.record.artist,
    thumbnailUrl: item.media.find((file) => file.kind === "photo")?.url ?? null,
    media: item.media,
  }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-3">
      <PublishReview
        items={reviewItems}
        initialText={
          items.length === 1 && items[0] !== undefined
            ? buildFacebookPost(items[0].record, { available: t("availableLabel"), sold: t("soldLabel") })
            : ""
        }
      />
    </main>
  );
}
