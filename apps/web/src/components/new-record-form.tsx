"use client";

import {
  MAX_MEDIA,
  checkAddMedia,
  checkMediaFile,
  normalizeRecordInput,
  type RecordInput,
  type RecordInputError,
  type RecordInputField,
} from "@disco/domain";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState, type ChangeEvent } from "react";
import {
  registerMediaAction,
  requestUploadAction,
  saveRecordAction,
} from "@/app/admin/records/new/actions";
import { preparePhoto, readVideoDuration, sendToSignedUrl } from "@/lib/browser-media";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft-storage";
import { mediaKindOfFile, videoContentType } from "@/lib/file-kind";
import {
  initialItems,
  mediaItemsReducer,
  slotsOf,
  uploadsInProgress,
  type MediaItem,
} from "@/lib/media-items";
import { uploadMedia, type UploadMediaJob } from "@/lib/upload-media";

const EMPTY_FIELDS: RecordInput = { title: "", artist: "", priceText: "", notes: "" };
const FIELDS = [
  { name: "title", label: "title", placeholder: "titlePlaceholder" },
  { name: "artist", label: "artist", placeholder: "artistPlaceholder" },
  { name: "notes", label: "notes", placeholder: "notesPlaceholder" },
  { name: "priceText", label: "price", placeholder: "pricePlaceholder" },
] as const;

const FAILURES = [
  "unsupported_type", "empty", "too_big", "too_long", "duration_unknown", "too_many",
  "too_many_videos", "not_uploaded", "invalid_id", "unauthenticated", "failed",
] as const;

function failureKey(reason: string | undefined): (typeof FAILURES)[number] {
  return FAILURES.find((known) => known === reason) ?? "failed";
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type FieldErrors = Partial<Record<RecordInputField, RecordInputError>>;

export function NewRecordForm({ apiKey }: { apiKey: string }) {
  const t = useTranslations("capture");
  const router = useRouter();
  const [recordId, setRecordId] = useState(() => crypto.randomUUID());
  const [fields, setFields] = useState<RecordInput>(EMPTY_FIELDS);
  const [items, dispatch] = useReducer(mediaItemsReducer, initialItems);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const jobs = useRef(new Map<string, UploadMediaJob>());
  const draftReady = useRef<Promise<boolean> | null>(null);
  const fieldsRef = useRef(fields);
  const recordIdRef = useRef(recordId);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Restore what was typed before the tab closed or the connection dropped.
  useEffect(() => {
    const draft = loadDraft(localStorage);
    if (draft !== null) {
      recordIdRef.current = draft.recordId;
      fieldsRef.current = draft.fields;
      setRecordId(draft.recordId);
      setFields(draft.fields);
      setNotice(t("restored"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on load
  }, []);

  function changeField(name: RecordInputField, value: string) {
    const next = { ...fieldsRef.current, [name]: value };
    fieldsRef.current = next;
    setFields(next);
    setErrors({});
    saveDraft(localStorage, recordIdRef.current, next);
  }

  /** The record must exist before its first file goes up, so nothing uploaded is ever orphaned. */
  function ensureDraft(): Promise<boolean> {
    draftReady.current ??= saveRecordAction({ recordId: recordIdRef.current, input: EMPTY_FIELDS, publish: false }).then(
      (result) => {
        if (!result.ok) {
          draftReady.current = null;
        }
        return result.ok;
      },
    );
    return draftReady.current;
  }

  async function upload(id: string) {
    const job = jobs.current.get(id);
    if (job === undefined) {
      return;
    }
    dispatch({ type: "status", id, status: "uploading" });
    if (!(await ensureDraft())) {
      dispatch({ type: "failed", id, reason: "failed" });
      return;
    }
    const result = await uploadMedia(
      {
        requestUpload: requestUploadAction,
        registerMedia: registerMediaAction,
        send: (url, blob, onProgress) => sendToSignedUrl(url, blob, apiKey, onProgress),
        wait,
      },
      job,
      {
        onProgress: (progress) => {
          dispatch({ type: "progress", id, progress });
        },
        onRetry: (attempt) => {
          dispatch({ type: "retrying", id, attempt });
        },
      },
    );
    if (result.ok) {
      dispatch({ type: "status", id, status: "done", position: result.position });
    } else {
      dispatch({ type: "failed", id, reason: result.reason });
    }
  }

  async function addFile(file: File) {
    const id = crypto.randomUUID();
    const kind = mediaKindOfFile(file);
    const fail = (reason: string, previewUrl = "") => {
      dispatch({
        type: "add",
        item: { id, kind: kind ?? "photo", status: "failed", progress: 0, previewUrl, reason },
      });
    };
    if (kind === null) {
      fail("unsupported_type");
      return;
    }
    const room = checkAddMedia(slotsOf(itemsRef.current), kind);
    if (!room.ok) {
      fail(room.reason);
      return;
    }
    const item: MediaItem = { id, kind, status: "preparing", progress: 0, previewUrl: URL.createObjectURL(file) };
    itemsRef.current = [...itemsRef.current, item];
    dispatch({ type: "add", item });

    let job: UploadMediaJob;
    if (kind === "photo") {
      const prepared = await preparePhoto(file);
      if (prepared === null) {
        dispatch({ type: "failed", id, reason: "unsupported_type" });
        return;
      }
      job = { recordId: recordIdRef.current, mediaId: id, blob: prepared.blob, contentType: prepared.contentType, sizeBytes: prepared.sizeBytes };
    } else {
      const durationSeconds = await readVideoDuration(file);
      const contentType = videoContentType(file);
      const check = checkMediaFile({ contentType, sizeBytes: file.size, ...(durationSeconds === undefined ? {} : { durationSeconds }) });
      if (!check.ok) {
        dispatch({ type: "failed", id, reason: check.reason });
        return;
      }
      job = { recordId: recordIdRef.current, mediaId: id, blob: file, contentType, sizeBytes: file.size, ...(check.durationSeconds === null ? {} : { durationSeconds: check.durationSeconds }) };
    }
    jobs.current.set(id, job);
    await upload(id);
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    setNotice(null);
    for (const file of picked) {
      void addFile(file);
    }
  }

  function retry(id: string) {
    void upload(id);
  }

  function remove(id: string) {
    jobs.current.delete(id);
    dispatch({ type: "remove", id });
  }

  const busy = uploadsInProgress(items);
  const hasMedia = items.some((item) => item.status === "done");

  async function save(publish: boolean) {
    setNotice(null);
    const checked = normalizeRecordInput(fieldsRef.current);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setSaving(true);
    const result = await saveRecordAction({ recordId: recordIdRef.current, input: fieldsRef.current, publish });
    setSaving(false);
    if (!result.ok) {
      if (result.reason === "invalid_input") {
        setErrors(result.errors);
      } else {
        setNotice(t(`saveError.${result.reason}`));
      }
      return;
    }
    clearDraft(localStorage);
    if (!publish) {
      router.push("/admin");
      return;
    }
    const nextId = crypto.randomUUID();
    recordIdRef.current = nextId;
    fieldsRef.current = EMPTY_FIELDS;
    jobs.current.clear();
    draftReady.current = null;
    setRecordId(nextId);
    setFields(EMPTY_FIELDS);
    dispatch({ type: "reset" });
    setNotice(t("saved"));
  }

  const canPublish = hasMedia && !busy && !saving;

  return (
    <form
      className="flex flex-col gap-5 pb-44"
      data-record-id={recordId}
      onSubmit={(event) => {
        event.preventDefault();
        if (canPublish) {
          void save(true);
        }
      }}
    >
      <section className="flex flex-col gap-3" aria-labelledby="media-title">
        <div className="flex items-baseline justify-between">
          <h2 id="media-title" className="text-lg font-bold">
            {t("mediaTitle")}
          </h2>
          <span className="text-sm text-muted">{t("mediaCount", { count: items.length, max: MAX_MEDIA })}</span>
        </div>
        <ul className="grid grid-cols-4 gap-2">
          {items.map((item) => (
            <li key={item.id} className="relative aspect-square overflow-hidden rounded-2xl bg-line">
              {item.previewUrl !== "" && item.kind === "photo" && (
                // eslint-disable-next-line @next/next/no-img-element -- local preview, not a remote image
                <img src={item.previewUrl} alt="" className="size-full object-cover" />
              )}
              {item.previewUrl !== "" && item.kind === "video" && (
                <video src={item.previewUrl} muted playsInline className="size-full object-cover" />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-ink/80 px-1 text-xs font-bold text-accent-ink">
                {item.status === "uploading"
                  ? item.attempt === undefined
                    ? t("item.uploading", { percent: item.progress })
                    : t("item.retrying")
                  : item.status === "failed"
                    ? ""
                    : t(`item.${item.status}`)}
              </span>
              <button
                type="button"
                aria-label={t("removeMedia")}
                onClick={() => {
                  remove(item.id);
                }}
                className="absolute right-1 top-1 size-8 rounded-full bg-ink/80 font-bold text-accent-ink"
              >
                ×
              </button>
              {item.status === "failed" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-warn-soft p-1 text-center text-xs font-bold text-warn">
                  <span>{t(`failure.${failureKey(item.reason)}`)}</span>
                  {jobs.current.has(item.id) && (
                    <button
                      type="button"
                      onClick={() => {
                        retry(item.id);
                      }}
                      className="rounded-lg border-2 border-warn px-2 py-1"
                    >
                      {t("retryMedia")}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex h-14 cursor-pointer items-center justify-center rounded-2xl bg-ink text-base font-bold text-accent-ink">
            {t("takePhoto")}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPick} />
          </label>
          <label className="flex h-14 cursor-pointer items-center justify-center rounded-2xl border-2 border-ink text-base font-bold">
            {t("recordVideo")}
            <input type="file" accept="video/*" capture="environment" className="sr-only" onChange={onPick} />
          </label>
        </div>
        <label className="flex h-12 cursor-pointer items-center justify-center text-base font-bold underline underline-offset-4">
          {t("chooseGallery")}
          <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={onPick} />
        </label>
        <p className="text-sm text-muted">{t("mediaHint", { max: MAX_MEDIA })}</p>
      </section>

      <p className="text-sm text-muted">{t("optionalHint")}</p>

      {FIELDS.map(({ name, label, placeholder }) => (
        <div key={name} className="flex flex-col gap-2">
          <label htmlFor={name} className="text-base font-semibold">
            {t(`fields.${label}`)}
          </label>
          {name === "notes" ? (
            <textarea
              id={name}
              rows={2}
              value={fields[name]}
              placeholder={t(`fields.${placeholder}`)}
              onChange={(event) => {
                changeField(name, event.target.value);
              }}
              className="rounded-2xl border-2 border-field bg-card px-4 py-3 text-lg"
            />
          ) : (
            <input
              id={name}
              type="text"
              inputMode={name === "priceText" ? "numeric" : "text"}
              value={fields[name]}
              placeholder={t(`fields.${placeholder}`)}
              onChange={(event) => {
                changeField(name, event.target.value);
              }}
              className="h-14 rounded-2xl border-2 border-field bg-card px-4 text-lg"
            />
          )}
          {errors[name] !== undefined && (
            <p role="alert" className="text-sm font-bold text-danger">
              {t(`fieldError.${errors[name]}`)}
            </p>
          )}
        </div>
      ))}

      {notice !== null && (
        <p role="status" className="text-base font-bold">
          {notice}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 flex flex-col gap-2 border-t border-line bg-paper px-4 pb-5 pt-3">
        {!canPublish && !saving && (
          <p className="text-center text-sm text-muted">{busy ? t("waitUploads") : t("needMedia")}</p>
        )}
        <button
          type="submit"
          disabled={!canPublish}
          className="h-14 rounded-2xl bg-accent text-lg font-bold text-accent-ink disabled:bg-disabled disabled:text-muted"
        >
          {t("saveAndNext")}
        </button>
        <button
          type="button"
          disabled={busy || saving}
          onClick={() => {
            void save(false);
          }}
          className="h-12 text-base font-bold underline underline-offset-4 disabled:text-muted"
        >
          {t("saveDraftAndExit")}
        </button>
      </div>
    </form>
  );
}
