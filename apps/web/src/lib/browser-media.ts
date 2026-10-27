import { photoTargetSize } from "@disco/domain";
import type { SendResult } from "./upload-retry";

/** A file ready to upload: photos are scaled down and re-encoded, videos are sent as they are. */
export interface PreparedMedia {
  blob: Blob;
  contentType: string;
  sizeBytes: number;
  durationSeconds?: number;
}

const PHOTO_QUALITY = 0.8;

/**
 * Scales a photo down and re-encodes it as JPEG. Drawing it on a canvas fixes its
 * orientation and drops the EXIF data (including any GPS location).
 */
export async function preparePhoto(file: Blob): Promise<PreparedMedia | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const size = photoTargetSize(bitmap.width, bitmap.height);
    if (size === null) {
      bitmap.close();
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", PHOTO_QUALITY);
    });
    return blob === null ? null : { blob, contentType: "image/jpeg", sizeBytes: blob.size };
  } catch {
    return null;
  }
}

/** Reads how long a video lasts from its metadata, without playing it. */
export function readVideoDuration(file: Blob): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const finish = (seconds: number | undefined) => {
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      finish(Number.isFinite(video.duration) ? video.duration : undefined);
    };
    video.onerror = () => {
      finish(undefined);
    };
    video.src = url;
  });
}

function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

/**
 * Uploads a file to the signed address with progress. It sends the same multipart
 * form as the Supabase storage library (the file goes in the field with an empty name).
 */
export function sendToSignedUrl(
  signedUrl: string,
  file: Blob,
  apiKey: string,
  onProgress: (percent: number) => void,
): Promise<SendResult> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("PUT", signedUrl);
    request.setRequestHeader("apikey", apiKey);
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      const ok = request.status >= 200 && request.status < 300;
      resolve(ok ? { ok: true } : { ok: false, retryable: isRetryableStatus(request.status) });
    };
    request.onerror = () => {
      resolve({ ok: false, retryable: true });
    };
    request.ontimeout = () => {
      resolve({ ok: false, retryable: true });
    };

    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", file);
    request.send(form);
  });
}
