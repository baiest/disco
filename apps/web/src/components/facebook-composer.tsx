"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { markPostedAction } from "@/app/admin/publish/actions";
import { clearBatch, notifyBatchChanged } from "@/lib/batch-storage";
import { copyText, fetchFiles, shareFiles, type MediaLink } from "@/lib/share-media";
import { BottomBar } from "./bottom-bar";

const DONE_ERRORS = ["invalid_ids", "unauthenticated", "failed"] as const;

interface Props {
  recordIds: string[];
  media: MediaLink[];
  initialText: string;
}

type Files = { state: "loading" } | { state: "failed" } | { state: "ready"; files: File[] };

export function FacebookComposer({ recordIds, media, initialText }: Props) {
  const t = useTranslations("publish");
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState<Files>({ state: "loading" });
  const [message, setMessage] = useState<string | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [busy, setBusy] = useState(false);

  // The files are fetched up front: the share sheet only opens straight from a tap.
  const load = useCallback(async () => {
    setFiles({ state: "loading" });
    const result = await fetchFiles((url) => fetch(url), media);
    setFiles(result.ok ? { state: "ready", files: result.files } : { state: "failed" });
  }, [media]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copy() {
    setMessage((await copyText(navigator, text)) ? t("copied") : t("copyFailed"));
  }

  async function share() {
    if (files.state !== "ready") {
      return;
    }
    // Copy first: once the share sheet is open this page loses the right to use the clipboard.
    const copied = text.trim() !== "" && (await copyText(navigator, text));
    const outcome = await shareFiles(navigator, files.files, text.trim());
    if (outcome === "shared") {
      setMessage(t(copied ? "sharedPasteHint" : "sharedHint"));
    } else if (outcome === "unsupported") {
      setShowSave(true);
      setMessage(t("unsupported"));
    } else if (outcome === "failed") {
      setShowSave(true);
      setMessage(t("shareFailed"));
    }
  }

  async function done() {
    setBusy(true);
    const result = await markPostedAction(recordIds);
    setBusy(false);
    if (!result.ok) {
      const reason = DONE_ERRORS.find((known) => known === result.reason) ?? "failed";
      setMessage(t(`doneError.${reason}`));
      return;
    }
    clearBatch(localStorage);
    notifyBatchChanged();
    router.push("/admin");
  }

  const stepNumber = "flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-base font-bold text-accent-ink";
  const stepButton = "h-14 flex-1 rounded-2xl border-2 border-ink text-base font-bold disabled:border-line disabled:bg-disabled disabled:text-muted";

  return (
    <div className="flex flex-col gap-5 pb-28">
      <div className="flex flex-col gap-2">
        <label htmlFor="post-text" className="text-base font-semibold">
          {t("textLabel")}
        </label>
        <textarea
          id="post-text"
          rows={5}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          className="rounded-2xl border-2 border-field bg-card px-4 py-3 text-lg leading-snug"
        />
        <span className="text-sm text-muted">{t("textHint")}</span>
      </div>

      <ol className="flex flex-col gap-3">
        <li className="flex items-center gap-3">
          <span className={stepNumber}>1</span>
          <button type="button" onClick={() => void copy()} className={stepButton}>
            {t("copy")}
          </button>
        </li>
        <li className="flex items-center gap-3">
          <span className={stepNumber}>2</span>
          <button type="button" disabled={files.state !== "ready"} onClick={() => void share()} className={stepButton}>
            {files.state === "loading" ? t("loadingFiles") : t("share")}
          </button>
        </li>
        <li className="flex items-center gap-3">
          <span className={stepNumber}>3</span>
          <span className="text-base leading-snug">{t("pasteStep")}</span>
        </li>
      </ol>

      {files.state === "failed" && (
        <div role="alert" className="flex flex-col gap-2">
          <p className="text-base font-bold text-danger">{t("loadFailed")}</p>
          <button type="button" onClick={() => void load()} className="h-12 rounded-2xl border-2 border-ink text-base font-bold">
            {t("retry")}
          </button>
        </div>
      )}

      {message !== null && (
        <p role="status" className="text-base font-bold">
          {message}
        </p>
      )}

      {showSave && (
        <section className="flex flex-col gap-2" aria-labelledby="save-files">
          <h2 id="save-files" className="text-base font-bold">
            {t("saveFiles")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {media.map((item, index) => (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center rounded-xl border-2 border-field px-3 text-sm font-bold"
                >
                  {t("saveFile", { number: index + 1, total: media.length })}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="rounded-2xl bg-line px-4 py-3 text-sm leading-snug text-muted">{t("note")}</p>

      <BottomBar>
        <button
          type="button"
          disabled={busy}
          onClick={() => void done()}
          className="h-14 w-full rounded-2xl bg-accent text-lg font-bold text-accent-ink disabled:bg-disabled disabled:text-muted"
        >
          {t("done")}
        </button>
      </BottomBar>
    </div>
  );
}
