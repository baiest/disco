export type MediaKind = "photo" | "video";

export const MAX_MEDIA = 8;
export const MAX_VIDEOS = 2;
export const MAX_VIDEO_SECONDS = 120;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const PHOTO_MAX_SIDE = 1600;
export const MAX_UPLOAD_ATTEMPTS = 4;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export function kindFromContentType(contentType: string): MediaKind | null {
  if (!(contentType in EXTENSIONS)) {
    return null;
  }
  return contentType.startsWith("video/") ? "video" : "photo";
}

export interface MediaSlot {
  kind: MediaKind;
  position: number;
}

export type AddMediaCheck = { ok: true; position: number } | { ok: false; reason: "too_many" | "too_many_videos" };

/** Whether one more photo or video fits in a record, and the first free position for it. */
export function checkAddMedia(existing: readonly MediaSlot[], kind: MediaKind): AddMediaCheck {
  if (existing.length >= MAX_MEDIA) {
    return { ok: false, reason: "too_many" };
  }
  if (kind === "video" && existing.filter((item) => item.kind === "video").length >= MAX_VIDEOS) {
    return { ok: false, reason: "too_many_videos" };
  }
  const used = new Set(existing.map((item) => item.position));
  let position = 0;
  while (used.has(position)) {
    position += 1;
  }
  return { ok: true, position };
}

export interface MediaFile {
  contentType: string;
  sizeBytes: number;
  /** Needed for videos; read from the file's metadata. */
  durationSeconds?: number;
}

export type MediaFileCheck =
  | { ok: true; kind: MediaKind; durationSeconds: number | null }
  | { ok: false; reason: "unsupported_type" | "empty" | "too_big" | "too_long" | "duration_unknown" };

/** Checks a file against the limits before uploading it (the database and storage enforce them too). */
export function checkMediaFile(file: MediaFile): MediaFileCheck {
  const kind = kindFromContentType(file.contentType);
  if (kind === null) {
    return { ok: false, reason: "unsupported_type" };
  }
  if (file.sizeBytes <= 0) {
    return { ok: false, reason: "empty" };
  }
  if (kind === "photo") {
    return file.sizeBytes > MAX_PHOTO_BYTES ? { ok: false, reason: "too_big" } : { ok: true, kind, durationSeconds: null };
  }

  if (file.sizeBytes > MAX_VIDEO_BYTES) {
    return { ok: false, reason: "too_big" };
  }
  const seconds = file.durationSeconds;
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
    return { ok: false, reason: "duration_unknown" };
  }
  if (seconds > MAX_VIDEO_SECONDS) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true, kind, durationSeconds: Math.ceil(seconds) };
}

/** Size a photo is scaled to before upload: fits within `maxSide`, never enlarged. Null for nonsense sizes. */
export function photoTargetSize(
  width: number,
  height: number,
  maxSide: number = PHOTO_MAX_SIDE,
): { width: number; height: number } | null {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Wait before the next upload attempt after `failures` failures, or null to give up. */
export function retryDelayMs(failures: number): number | null {
  if (failures < 1 || failures >= MAX_UPLOAD_ATTEMPTS) {
    return null;
  }
  return 1000 * 2 ** (failures - 1);
}

/** Storage path of a media file: it must start with the owner and record folders (a database rule). */
export function mediaPath(ownerId: string, recordId: string, mediaId: string, contentType: string): string | null {
  const extension = EXTENSIONS[contentType];
  return extension === undefined ? null : `${ownerId}/${recordId}/${mediaId}.${extension}`;
}
