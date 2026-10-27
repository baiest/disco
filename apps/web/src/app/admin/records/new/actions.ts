"use server";

import type { RecordInput } from "@disco/domain";
import {
  registerMedia,
  requestUpload,
  saveRecord,
  type MediaRequest,
  type RegisterResult,
  type SaveRecordResult,
  type UploadResult,
} from "@/lib/capture";
import { createCaptureRepo } from "@/server/records-repo";

export async function saveRecordAction(request: {
  recordId: string;
  input: RecordInput;
  publish: boolean;
}): Promise<SaveRecordResult> {
  try {
    return await saveRecord(await createCaptureRepo(), request);
  } catch {
    return { ok: false, reason: "save_failed" };
  }
}

export async function requestUploadAction(request: MediaRequest): Promise<UploadResult> {
  try {
    return await requestUpload(await createCaptureRepo(), request);
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function registerMediaAction(request: MediaRequest): Promise<RegisterResult> {
  try {
    return await registerMedia(await createCaptureRepo(), request);
  } catch {
    return { ok: false, reason: "failed" };
  }
}
