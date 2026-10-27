"use server";

import type { RecordInput } from "@disco/domain";
import {
  registerMedia,
  removeMedia,
  requestUpload,
  saveRecord,
  type MediaRequest,
  type RemoveMediaResult,
  type RegisterResult,
  type SaveRecordResult,
  type UploadResult,
} from "@/lib/capture";
import { createCaptureRepo, loadDraftMedia, type RestoredMedia } from "@/server/records-repo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function removeMediaAction(request: { recordId: string; mediaId: string }): Promise<RemoveMediaResult> {
  try {
    return await removeMedia(await createCaptureRepo(), request);
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/** The files already uploaded to a draft, for when the page is reloaded in the middle of a record. */
export async function loadDraftMediaAction(recordId: string): Promise<RestoredMedia[]> {
  try {
    return UUID.test(recordId) ? await loadDraftMedia(recordId) : [];
  } catch {
    return [];
  }
}
