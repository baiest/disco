import {
  checkAddMedia,
  checkMediaFile,
  mediaPath,
  normalizeRecordInput,
  type MediaKind,
  type MediaSlot,
  type RecordInput,
  type RecordInputError,
  type RecordInputField,
  type RecordValues,
} from "@disco/domain";

export type RepoResult = { ok: true } | { ok: false; reason: "no_media" | "limit" | "other" };

/** What the capture logic needs from storage and the database. The Supabase module implements it. */
export interface CaptureRepo {
  currentUserId: () => Promise<string | null>;
  upsertRecord: (record: { id: string } & RecordValues) => Promise<RepoResult>;
  listMedia: (recordId: string) => Promise<MediaSlot[] | null>;
  createSignedUpload: (path: string) => Promise<{ signedUrl: string } | null>;
  mediaExists: (path: string) => Promise<boolean>;
  insertMedia: (row: {
    id: string;
    recordId: string;
    ownerId: string;
    path: string;
    position: number;
    kind: MediaKind;
    durationSeconds: number | null;
  }) => Promise<RepoResult>;
  setStatus: (recordId: string, status: "available") => Promise<RepoResult>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SaveRecordResult =
  | { ok: true }
  | { ok: false; reason: "invalid_id" | "unauthenticated" | "save_failed" | "no_media" }
  | { ok: false; reason: "invalid_input"; errors: Partial<Record<RecordInputField, RecordInputError>> };

/**
 * Saves the record the owner is filling in. It becomes available when `publish` is
 * true (the database refuses it without a photo or video); otherwise it stays a draft.
 */
export async function saveRecord(
  repo: CaptureRepo,
  request: { recordId: string; input: RecordInput; publish: boolean },
): Promise<SaveRecordResult> {
  if (!UUID.test(request.recordId)) {
    return { ok: false, reason: "invalid_id" };
  }
  if ((await repo.currentUserId()) === null) {
    return { ok: false, reason: "unauthenticated" };
  }

  const input = normalizeRecordInput(request.input);
  if (!input.ok) {
    return { ok: false, reason: "invalid_input", errors: input.errors };
  }

  const saved = await repo.upsertRecord({ id: request.recordId, ...input.value });
  if (!saved.ok) {
    return { ok: false, reason: "save_failed" };
  }
  if (!request.publish) {
    return { ok: true };
  }

  const published = await repo.setStatus(request.recordId, "available");
  if (published.ok) {
    return { ok: true };
  }
  return { ok: false, reason: published.reason === "no_media" ? "no_media" : "save_failed" };
}

export interface MediaRequest {
  recordId: string;
  mediaId: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds?: number;
}

export type MediaFailure =
  | "invalid_id"
  | "unauthenticated"
  | "unsupported_type"
  | "empty"
  | "too_big"
  | "too_long"
  | "duration_unknown"
  | "too_many"
  | "too_many_videos"
  | "failed";

interface Prepared {
  ok: true;
  userId: string;
  kind: MediaKind;
  durationSeconds: number | null;
  path: string;
  position: number;
}

/** Checks a media request and works out where the file goes. Nothing the client says is trusted for the path or position. */
async function prepare(repo: CaptureRepo, request: MediaRequest): Promise<Prepared | { ok: false; reason: MediaFailure }> {
  if (!UUID.test(request.recordId) || !UUID.test(request.mediaId)) {
    return { ok: false, reason: "invalid_id" };
  }
  const userId = await repo.currentUserId();
  if (userId === null) {
    return { ok: false, reason: "unauthenticated" };
  }

  const file = checkMediaFile({
    contentType: request.contentType,
    sizeBytes: request.sizeBytes,
    ...(request.durationSeconds === undefined ? {} : { durationSeconds: request.durationSeconds }),
  });
  if (!file.ok) {
    return { ok: false, reason: file.reason };
  }

  const existing = await repo.listMedia(request.recordId);
  const path = mediaPath(userId, request.recordId, request.mediaId, request.contentType);
  if (existing === null || path === null) {
    return { ok: false, reason: "failed" };
  }
  const slot = checkAddMedia(existing, file.kind);
  if (!slot.ok) {
    return { ok: false, reason: slot.reason };
  }
  return { ok: true, userId, kind: file.kind, durationSeconds: file.durationSeconds, path, position: slot.position };
}

export type UploadResult =
  | { ok: true; upload: { path: string; signedUrl: string; position: number; kind: MediaKind; durationSeconds: number | null } }
  | { ok: false; reason: MediaFailure };

/** Step 1 of adding media: checks the file and hands out a signed address to upload it to. */
export async function requestUpload(repo: CaptureRepo, request: MediaRequest): Promise<UploadResult> {
  const prepared = await prepare(repo, request);
  if (!prepared.ok) {
    return prepared;
  }
  const signed = await repo.createSignedUpload(prepared.path);
  if (signed === null) {
    return { ok: false, reason: "failed" };
  }
  return {
    ok: true,
    upload: {
      path: prepared.path,
      signedUrl: signed.signedUrl,
      position: prepared.position,
      kind: prepared.kind,
      durationSeconds: prepared.durationSeconds,
    },
  };
}

export type RegisterResult = { ok: true; position: number } | { ok: false; reason: MediaFailure | "not_uploaded" };

/** Step 2: once the file is uploaded, adds it to the record. The database enforces the limits again. */
export async function registerMedia(repo: CaptureRepo, request: MediaRequest): Promise<RegisterResult> {
  const prepared = await prepare(repo, request);
  if (!prepared.ok) {
    return prepared;
  }
  if (!(await repo.mediaExists(prepared.path))) {
    return { ok: false, reason: "not_uploaded" };
  }

  const inserted = await repo.insertMedia({
    id: request.mediaId,
    recordId: request.recordId,
    ownerId: prepared.userId,
    path: prepared.path,
    position: prepared.position,
    kind: prepared.kind,
    durationSeconds: prepared.durationSeconds,
  });
  if (inserted.ok) {
    return { ok: true, position: prepared.position };
  }
  return { ok: false, reason: inserted.reason === "limit" ? "too_many" : "failed" };
}
