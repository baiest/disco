"use client";

import type { RecordInput, RecordInputError, RecordInputField, RecordStatus } from "@disco/domain";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  changeStatusAction,
  deleteRecordAction,
  saveFieldsAction,
  setPricePublicAction,
  undoStatusAction,
} from "@/app/admin/records/[id]/actions";
import { BatchToggle } from "./batch-toggle";
import { ConfirmDialog } from "./confirm-dialog";
import { PriceInput, useFormatPrice } from "./price-input";

const UNDO_SECONDS = 8;
const FIELDS = [
  { name: "title", label: "title", placeholder: "titlePlaceholder" },
  { name: "artist", label: "artist", placeholder: "artistPlaceholder" },
  { name: "notes", label: "notes", placeholder: "notesPlaceholder" },
  { name: "priceText", label: "price", placeholder: "pricePlaceholder" },
] as const;
const STATUS_ERRORS = [
  "invalid_id", "unauthenticated", "not_found", "invalid_status", "no_media", "same_status", "publish_first", "failed",
] as const;
const SAVE_ERRORS = ["invalid_id", "unauthenticated", "failed"] as const;
const DELETE_ERRORS = ["invalid_id", "unauthenticated", "not_found", "failed"] as const;
const TARGETS: RecordStatus[] = ["available", "sold", "unavailable"];

export interface MediaView {
  id: string;
  kind: "photo" | "video";
  url: string;
}

interface Props {
  recordId: string;
  initialStatus: RecordStatus;
  initialFields: RecordInput;
  soldOn: string | null;
  media: MediaView[];
  /** The record was posted on Facebook, which the app cannot take down. */
  postedOnFacebook: boolean;
  /** Customers see this record's price in the public catalog. */
  showPricePublic: boolean;
}

function known<T extends string>(list: readonly T[], value: string, fallback: T): T {
  return list.find((item) => item === value) ?? fallback;
}

export function RecordDetail({ recordId, initialStatus, initialFields, soldOn, media, postedOnFacebook, showPricePublic }: Props) {
  const t = useTranslations("detail");
  const capture = useTranslations("capture");
  const [status, setStatus] = useState<RecordStatus>(initialStatus);
  const [undo, setUndo] = useState<{ previous: RecordStatus; next: RecordStatus } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const formatPrice = useFormatPrice();
  const [fields, setFields] = useState<RecordInput>(() => ({ ...initialFields, priceText: formatPrice(initialFields.priceText) }));
  const [errors, setErrors] = useState<Partial<Record<RecordInputField, RecordInputError>>>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [priceIsPublic, setPriceIsPublic] = useState(showPricePublic);
  const [pricePublicError, setPricePublicError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  async function change(next: RecordStatus) {
    setBusy(true);
    setMessage(null);
    const result = await changeStatusAction({ recordId, status: next });
    setBusy(false);
    if (!result.ok) {
      setUndo(null);
      setMessage(t(`statusError.${known(STATUS_ERRORS, result.reason, "failed")}`));
      return;
    }
    setStatus(next);
    setUndo({ previous: result.previousStatus, next });
    if (timer.current !== null) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      setUndo(null);
    }, UNDO_SECONDS * 1000);
  }

  async function goBack() {
    if (undo === null) {
      return;
    }
    setBusy(true);
    const result = await undoStatusAction({ recordId, previousStatus: undo.previous });
    setBusy(false);
    if (!result.ok) {
      setMessage(t(`statusError.${known(STATUS_ERRORS, result.reason, "failed")}`));
      return;
    }
    setStatus(undo.previous);
    setMessage(t("undone", { status: t(`status.${undo.previous}`) }));
    setUndo(null);
  }

  async function changePricePublic(next: boolean) {
    setPricePublicError(null);
    setPriceIsPublic(next);
    const result = await setPricePublicAction({ recordId, show: next });
    if (!result.ok) {
      setPriceIsPublic(!next);
      setPricePublicError(t("pricePublicError"));
    }
  }

  async function deleteRecord() {
    setBusy(true);
    setDeleteError(null);
    const result = await deleteRecordAction(recordId);
    if (result.ok) {
      router.push(`/admin?undo=${recordId}`);
      return;
    }
    setBusy(false);
    setDeleteError(t(`deleteError.${known(DELETE_ERRORS, result.reason, "failed")}`));
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    setErrors({});
    const result = await saveFieldsAction({ recordId, input: fields });
    setBusy(false);
    if (result.ok) {
      setMessage(t("saved"));
    } else if (result.reason === "invalid_input") {
      setErrors(result.errors);
    } else {
      setMessage(t(`saveError.${known(SAVE_ERRORS, result.reason, "failed")}`));
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <section className="flex flex-col gap-3" aria-labelledby="media-title">
        <h2 id="media-title" className="text-lg font-bold">
          {t("mediaTitle")}
        </h2>
        {media.length === 0 ? (
          <p className="text-base text-muted">{t("noMedia")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {media.map((item) => (
              <li key={item.id} className="aspect-square overflow-hidden rounded-2xl bg-line">
                {item.kind === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- private signed link, not optimised by Next
                  <img src={item.url} alt="" className="size-full object-cover" />
                ) : (
                  <video src={item.url} controls preload="metadata" playsInline className="size-full object-cover" />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="status-title">
        <h2 id="status-title" className="text-lg font-bold">
          {t("statusTitle")}
        </h2>
        <p className="text-xl font-extrabold" data-testid="current-status">
          {t(`status.${status}`)}
          {status === "sold" && soldOn !== null && <span className="ml-2 text-base font-semibold text-muted">{t("soldOn", { date: soldOn })}</span>}
        </p>
        <div className="grid grid-cols-1 gap-2">
          {status === "draft" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void change("available")}
              className="h-14 rounded-2xl bg-accent text-lg font-bold text-accent-ink disabled:bg-disabled disabled:text-muted"
            >
              {t("publish")}
            </button>
          ) : (
            TARGETS.map((target) => (
              <button
                key={target}
                type="button"
                disabled={busy || target === status}
                onClick={() => void change(target)}
                className="h-14 rounded-2xl border-2 border-ink text-lg font-bold disabled:border-line disabled:bg-disabled disabled:text-muted"
              >
                {t(`status.${target}`)}
              </button>
            ))
          )}
        </div>
        {status === "available" && <BatchToggle recordId={recordId} />}
        {(status === "available" || status === "sold") && (
          <Link href={`/disco/${recordId}`} className="flex h-12 items-center text-base font-bold underline underline-offset-4">
            {t("seePublic")}
          </Link>
        )}
        {undo !== null && (
          <div role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-accent-ink">
            <span className="text-base font-bold">{t("changed", { status: t(`status.${undo.next}`) })}</span>
            <button type="button" disabled={busy} onClick={() => void goBack()} className="h-11 rounded-xl px-3 text-base font-bold underline underline-offset-4">
              {t("undo")}
            </button>
          </div>
        )}
      </section>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {FIELDS.map(({ name, label, placeholder }) => (
          <div key={name} className="flex flex-col gap-2">
            <label htmlFor={name} className="text-base font-semibold">
              {capture(`fields.${label}`)}
            </label>
            {name === "notes" ? (
              <textarea
                id={name}
                rows={3}
                value={fields[name]}
                placeholder={capture(`fields.${placeholder}`)}
                onChange={(event) => {
                  setFields({ ...fields, [name]: event.target.value });
                }}
                className="rounded-2xl border-2 border-field bg-card px-4 py-3 text-lg"
              />
            ) : name === "priceText" ? (
              <PriceInput
                id={name}
                value={fields[name]}
                placeholder={capture(`fields.${placeholder}`)}
                onChange={(value) => {
                  setFields({ ...fields, [name]: value });
                }}
              />
            ) : (
              <input
                id={name}
                type="text"
                value={fields[name]}
                placeholder={capture(`fields.${placeholder}`)}
                onChange={(event) => {
                  setFields({ ...fields, [name]: event.target.value });
                }}
                className="h-14 rounded-2xl border-2 border-field bg-card px-4 text-lg"
              />
            )}
            {errors[name] !== undefined && (
              <p role="alert" className="text-sm font-bold text-danger">
                {capture(`fieldError.${errors[name]}`)}
              </p>
            )}
          </div>
        ))}
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4">
          <label className="flex items-center justify-between gap-3 text-base font-bold">
            <span>{t("showPricePublic")}</span>
            <input
              type="checkbox"
              role="switch"
              checked={priceIsPublic}
              disabled={fields.priceText.trim() === ""}
              onChange={(event) => {
                void changePricePublic(event.target.checked);
              }}
              className="size-7 shrink-0 accent-accent"
            />
          </label>
          <p className="text-sm text-muted">{fields.priceText.trim() === "" ? t("showPriceNeedsPrice") : t("showPricePublicHint")}</p>
          {pricePublicError !== null && (
            <p role="alert" className="text-sm font-bold text-danger">
              {pricePublicError}
            </p>
          )}
        </div>
        <button type="submit" disabled={busy} className="h-14 rounded-2xl bg-accent text-lg font-bold text-accent-ink disabled:bg-disabled disabled:text-muted">
          {t("save")}
        </button>
      </form>

      {message !== null && (
        <p role="status" className="text-base font-bold">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          setDeleteError(null);
          setConfirmingDelete(true);
        }}
        className="h-14 rounded-2xl border-2 border-danger text-lg font-bold text-danger"
      >
        {t("deleteButton")}
      </button>

      {confirmingDelete && (
        <ConfirmDialog
          title={t("deleteTitle")}
          body={t(postedOnFacebook ? "deleteBodyFacebook" : "deleteBody")}
          confirmLabel={t("deleteConfirm")}
          cancelLabel={t("deleteCancel")}
          busy={busy}
          error={deleteError}
          onConfirm={() => void deleteRecord()}
          onCancel={() => {
            setConfirmingDelete(false);
          }}
        />
      )}
    </div>
  );
}
