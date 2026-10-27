import { MAX_POST_MEDIA } from "./facebook-post";
import { isImagePath } from "./inventory";

export interface BatchSummary {
  id: string;
  title: string | null;
  artist: string | null;
  mediaCount: number;
  /** Storage path of the first image, or null when the record only has videos. */
  thumbnailPath: string | null;
}

/**
 * One line per record of the batch, in the order the owner added them. Records that are no longer there
 * (sold, deleted, not available) simply do not show up, so the batch cleans itself.
 */
export function buildBatchSummaries(
  ids: readonly string[],
  records: readonly { id: string; title: string | null; artist: string | null }[],
  media: readonly { recordId: string; path: string }[],
): BatchSummary[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  return [...new Set(ids)].flatMap((id): BatchSummary[] => {
    const record = byId.get(id);
    if (record === undefined) {
      return [];
    }
    const files = media.filter((file) => file.recordId === id);
    return [
      {
        id,
        title: record.title,
        artist: record.artist,
        mediaCount: files.length,
        thumbnailPath: files.find((file) => isImagePath(file.path))?.path ?? null,
      },
    ];
  });
}

export interface BatchTotals {
  records: number;
  files: number;
  /** More files than one Facebook post holds. */
  over: boolean;
  /** How many more files fit; negative when over. */
  left: number;
}

export function batchTotals(items: readonly { mediaCount: number }[]): BatchTotals {
  const files = items.reduce((sum, item) => sum + item.mediaCount, 0);
  return { records: items.length, files, over: files > MAX_POST_MEDIA, left: MAX_POST_MEDIA - files };
}
