"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { sendLoginLink, type LoginFormState } from "./actions";

const initialState: LoginFormState = { status: "idle" };

export function LoginForm() {
  const t = useTranslations("login");
  const [state, formAction, pending] = useActionState(sendLoginLink, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label htmlFor="email" className="text-lg font-medium">
        {t("emailLabel")}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder={t("emailPlaceholder")}
        className="h-14 rounded-xl border border-neutral-400 px-4 text-lg"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-14 rounded-xl bg-black text-lg font-semibold text-white disabled:opacity-60"
      >
        {t("submit")}
      </button>
      {state.status !== "idle" && (
        <p role="status" className={state.status === "sent" ? "text-lg text-green-800" : "text-lg text-red-700"}>
          {t(`status.${state.status}`)}
        </p>
      )}
    </form>
  );
}
