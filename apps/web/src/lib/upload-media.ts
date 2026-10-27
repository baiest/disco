import type { MediaRequest, RegisterResult, UploadResult } from "./capture";
import { uploadWithRetry, type SendResult } from "./upload-retry";

export interface UploadMediaDeps {
  requestUpload: (request: MediaRequest) => Promise<UploadResult>;
  registerMedia: (request: MediaRequest) => Promise<RegisterResult>;
  send: (signedUrl: string, blob: Blob, onProgress: (percent: number) => void) => Promise<SendResult>;
  wait: (ms: number) => Promise<void>;
}

export interface UploadMediaJob extends MediaRequest {
  blob: Blob;
}

export interface UploadMediaCallbacks {
  onProgress: (percent: number) => void;
  /** Called with the number of the attempt that is about to start. */
  onRetry: (attempt: number) => void;
}

export type UploadMediaResult = { ok: true; position: number } | { ok: false; reason: string };

/** The three steps for one file: get permission, upload it with retries, add it to the record. */
export async function uploadMedia(
  deps: UploadMediaDeps,
  { blob, ...request }: UploadMediaJob,
  callbacks: UploadMediaCallbacks,
): Promise<UploadMediaResult> {
  try {
    const granted = await deps.requestUpload(request);
    if (!granted.ok) {
      return { ok: false, reason: granted.reason };
    }
    const outcome = await uploadWithRetry(
      () => deps.send(granted.upload.signedUrl, blob, callbacks.onProgress),
      deps.wait,
      (failures) => {
        callbacks.onRetry(failures + 1);
      },
    );
    if (!outcome.ok) {
      return { ok: false, reason: "failed" };
    }
    const registered = await deps.registerMedia(request);
    return registered.ok ? { ok: true, position: registered.position } : { ok: false, reason: registered.reason };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
