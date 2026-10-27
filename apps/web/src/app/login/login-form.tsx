"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { sendLoginLink, signInWithPasswordAction, type LoginFormState, type PasswordFormState } from "./actions";

const initialState: LoginFormState = { status: "idle" };
const initialPasswordState: PasswordFormState = { status: "idle" };

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
        className="h-14 rounded-2xl border border-field bg-card px-4 text-lg transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-14 rounded-2xl border-2 border-ink bg-transparent text-lg font-semibold text-ink transition active:scale-[0.98] disabled:opacity-60"
      >
        {t("submit")}
      </button>
      {state.status !== "idle" && (
        <p role="status" className={state.status === "sent" ? "text-lg text-ok" : "text-lg text-danger"}>
          {t(`status.${state.status}`)}
        </p>
      )}
    </form>
  );
}

export function PasswordForm() {
  const t = useTranslations("login");
  const [state, formAction, pending] = useActionState(signInWithPasswordAction, initialPasswordState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label htmlFor="password-email" className="text-lg font-medium">
        {t("emailLabel")}
      </label>
      <input
        id="password-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        required
        placeholder={t("emailPlaceholder")}
        className="h-14 rounded-2xl border border-field bg-card px-4 text-lg transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
      />
      <label htmlFor="password" className="text-lg font-medium">
        {t("passwordLabel")}
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="h-14 rounded-2xl border border-field bg-card px-4 text-lg transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-14 rounded-2xl bg-ink text-lg font-semibold text-accent-ink shadow-[0_4px_14px_rgb(28_25_23/0.25)] transition active:scale-[0.98] disabled:opacity-60"
      >
        {t("passwordSubmit")}
      </button>
      {state.status !== "idle" && (
        <p role="alert" className="text-lg text-danger">
          {t(`passwordStatus.${state.status}`)}
        </p>
      )}
    </form>
  );
}
