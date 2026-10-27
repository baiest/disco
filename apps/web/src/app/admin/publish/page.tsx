import { buildFacebookPost } from "@disco/domain";
import { getFormatter, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PublishHeader } from "@/components/publish-header";
import { PublishPicker, type PickerRow } from "@/components/publish-picker";
import { PublishReview, type ReviewItem } from "@/components/publish-review";
import { parseIds } from "@/lib/facebook-post";
import { parseSearch } from "@/lib/inventory";
import { loadPostItems, searchInventory, signThumbnails } from "@/server/records-repo";
import { getCurrentUserId } from "@/server/supabase/current-user";

type Props = { searchParams: Promise<{ ids?: string | string[]; q?: string | string[] }> };

export default async function PublishPage({ searchParams }: Props) {
  const params = await searchParams;
  const ids = parseIds(params.ids);
  const [t, format] = await Promise.all([getTranslations("publish"), getFormatter()]);
  if ((await getCurrentUserId()) === null) {
    redirect("/login");
  }

  if (ids.length === 0) {
    const { query } = parseSearch(params);
    const found = (await searchInventory({ query, filter: "available" })) ?? [];
    // Without a search, what was never posted comes first; with one, the order of the best match.
    const rank = (row: (typeof found)[number]) => (row.facebook_posted_at === null ? 0 : row.facebook_needs_update ? 1 : 2);
    const sorted = query === "" ? [...found].sort((a, b) => rank(a) - rank(b)) : found;
    const pictures = await signThumbnails(sorted.flatMap((row) => (row.first_media_path === null ? [] : [row.first_media_path])));
    const rows: PickerRow[] = sorted.map((row) => ({
      id: row.id,
      title: row.title,
      files: row.media_count,
      state:
        row.facebook_posted_at === null
          ? t("state.never")
          : row.facebook_needs_update
            ? t("state.needsUpdate")
            : t("state.posted", { date: format.dateTime(new Date(row.facebook_posted_at), { day: "numeric", month: "short" }) }),
      thumbnailUrl: row.first_media_path === null ? null : (pictures.get(row.first_media_path) ?? null),
    }));
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-3">
        <PublishHeader />
        <PublishPicker rows={rows} query={query} />
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
