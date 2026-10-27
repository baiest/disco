import {
  changeStatus,
  normalizeRecordInput,
  type DiscRecord,
  type RecordInput,
  type RecordInputError,
  type RecordInputField,
  type RecordStatus,
  type RecordValues,
} from "@disco/domain";
import type { RepoResult } from "./capture";

/** What the detail screen needs from the database. The Supabase module implements it. */
export interface DetailRepo {
  currentUserId: () => Promise<string | null>;
  getRecord: (recordId: string) => Promise<DiscRecord | null>;
  updateFields: (recordId: string, values: RecordValues) => Promise<RepoResult>;
  setStatus: (recordId: string, status: RecordStatus) => Promise<RepoResult>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Targets the owner can pick. A draft is only where a record starts; it comes back through undo. */
const TARGETS: readonly string[] = ["available", "sold", "unavailable"];
const RESTORABLE: readonly string[] = ["draft", "available", "sold", "unavailable"];

type Guard = "invalid_id" | "unauthenticated";

async function guard(repo: DetailRepo, recordId: string): Promise<Guard | null> {
  if (!UUID.test(recordId)) {
    return "invalid_id";
  }
  return (await repo.currentUserId()) === null ? "unauthenticated" : null;
}

export type ChangeStatusOutcome =
  | { ok: true; previousStatus: RecordStatus }
  | { ok: false; reason: Guard | "not_found" | "invalid_status" | "no_media" | "same_status" | "publish_first" | "failed" };

function repoFailure(result: Extract<RepoResult, { ok: false }>): "no_media" | "failed" {
  return result.reason === "no_media" ? "no_media" : "failed";
}

/** Moves a record to another status, following the domain rules, and says where to go back to. */
export async function changeRecordStatus(
  repo: DetailRepo,
  request: { recordId: string; status: string },
): Promise<ChangeStatusOutcome> {
  const blocked = await guard(repo, request.recordId);
  if (blocked !== null) {
    return { ok: false, reason: blocked };
  }
  const target = TARGETS.find((status) => status === request.status);
  if (target === undefined) {
    return { ok: false, reason: "invalid_status" };
  }
  const record = await repo.getRecord(request.recordId);
  if (record === null) {
    return { ok: false, reason: "not_found" };
  }
  const change = changeStatus(record, target as RecordStatus);
  if (!change.ok) {
    return change;
  }
  const saved = await repo.setStatus(request.recordId, target as RecordStatus);
  return saved.ok ? { ok: true, previousStatus: change.undo.previousStatus } : { ok: false, reason: repoFailure(saved) };
}

export type UndoOutcome = { ok: true } | { ok: false; reason: Guard | "invalid_status" | "no_media" | "failed" };

/** Puts back the status a change started from. */
export async function undoRecordStatus(
  repo: DetailRepo,
  request: { recordId: string; previousStatus: string },
): Promise<UndoOutcome> {
  const blocked = await guard(repo, request.recordId);
  if (blocked !== null) {
    return { ok: false, reason: blocked };
  }
  const status = RESTORABLE.find((known) => known === request.previousStatus);
  if (status === undefined) {
    return { ok: false, reason: "invalid_status" };
  }
  const saved = await repo.setStatus(request.recordId, status as RecordStatus);
  return saved.ok ? { ok: true } : { ok: false, reason: repoFailure(saved) };
}

export type UpdateFieldsOutcome =
  | { ok: true }
  | { ok: false; reason: Guard | "failed" }
  | { ok: false; reason: "invalid_input"; errors: Partial<Record<RecordInputField, RecordInputError>> };

/** Saves the title, artist, notes and price of a record, re-checking what the browser sent. */
export async function updateRecordFields(
  repo: DetailRepo,
  request: { recordId: string; input: RecordInput },
): Promise<UpdateFieldsOutcome> {
  const blocked = await guard(repo, request.recordId);
  if (blocked !== null) {
    return { ok: false, reason: blocked };
  }
  const checked = normalizeRecordInput(request.input);
  if (!checked.ok) {
    return { ok: false, reason: "invalid_input", errors: checked.errors };
  }
  const saved = await repo.updateFields(request.recordId, checked.value);
  return saved.ok ? { ok: true } : { ok: false, reason: "failed" };
}
