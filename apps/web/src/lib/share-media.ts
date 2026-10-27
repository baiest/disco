import type { MediaKind } from "@disco/domain";

/** The parts of `navigator` used to hand a post to Facebook, so tests can replace them. */
export interface ShareNavigator {
  canShare?: (data: { files: File[] }) => boolean;
  share?: (data: { files: File[]; text?: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

export async function copyText(nav: ShareNavigator, text: string): Promise<boolean> {
  try {
    if (nav.clipboard === undefined) {
      return false;
    }
    await nav.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export type ShareOutcome = "shared" | "cancelled" | "unsupported" | "failed";

/**
 * Opens the phone's share sheet with the files (Facebook is one of the choices). The text goes along for
 * the apps that use it; Facebook ignores it, so the screen also copies it for the owner to paste.
 */
export async function shareFiles(nav: ShareNavigator, files: File[], text = ""): Promise<ShareOutcome> {
  if (files.length === 0 || nav.share === undefined || nav.canShare?.({ files }) !== true) {
    return "unsupported";
  }
  try {
    await nav.share(text === "" ? { files } : { files, text });
    return "shared";
  } catch (error) {
    return error instanceof Error && error.name === "AbortError" ? "cancelled" : "failed";
  }
}

export interface MediaLink {
  id: string;
  kind: MediaKind;
  url: string;
}

type Fetcher = (url: string) => Promise<{ ok: boolean; blob: () => Promise<Blob> }>;

const FILE_TYPES = { photo: { type: "image/jpeg", extension: "jpg" }, video: { type: "video/mp4", extension: "mp4" } } as const;

/** Downloads the photos and videos so they can be shared as files. All of them, or nothing. */
export async function fetchFiles(
  fetcher: Fetcher,
  items: readonly MediaLink[],
  /** Called every time one more file is ready, with how many are ready so far. */
  onProgress?: (done: number) => void,
): Promise<{ ok: true; files: File[] } | { ok: false }> {
  let done = 0;
  try {
    const files = await Promise.all(
      items.map(async (item) => {
        const response = await fetcher(item.url);
        if (!response.ok) {
          throw new Error("download failed");
        }
        const blob = await response.blob();
        const { type, extension } = FILE_TYPES[item.kind];
        const file = new File([blob], `${item.id}.${extension}`, { type: blob.type === "" ? type : blob.type });
        done += 1;
        onProgress?.(done);
        return file;
      }),
    );
    return { ok: true, files };
  } catch {
    return { ok: false };
  }
}
