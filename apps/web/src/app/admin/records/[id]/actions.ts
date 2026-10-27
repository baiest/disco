"use server";

import type { RecordInput } from "@disco/domain";
import { revalidatePath } from "next/cache";
import {
  changeRecordStatus,
  undoRecordStatus,
  updateRecordFields,
  type ChangeStatusOutcome,
  type UndoOutcome,
  type UpdateFieldsOutcome,
} from "@/lib/record-detail";
import { createDetailRepo } from "@/server/records-repo";

export async function changeStatusAction(request: { recordId: string; status: string }): Promise<ChangeStatusOutcome> {
  try {
    const result = await changeRecordStatus(await createDetailRepo(), request);
    revalidatePath("/admin");
    return result;
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function undoStatusAction(request: { recordId: string; previousStatus: string }): Promise<UndoOutcome> {
  try {
    const result = await undoRecordStatus(await createDetailRepo(), request);
    revalidatePath("/admin");
    return result;
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function saveFieldsAction(request: { recordId: string; input: RecordInput }): Promise<UpdateFieldsOutcome> {
  try {
    const result = await updateRecordFields(await createDetailRepo(), request);
    revalidatePath("/admin");
    return result;
  } catch {
    return { ok: false, reason: "failed" };
  }
}
