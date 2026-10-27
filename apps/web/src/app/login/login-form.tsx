"use client";

import { useActionState } from "react";
import { es } from "@/copy/es";
import { sendLoginLink, type LoginFormState } from "./actions";

const initialState: LoginFormState = { message: null, sent: false };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(sendLoginLink, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label htmlFor="email" className="text-lg font-medium">
        {es.login.emailLabel}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder={es.login.emailPlaceholder}
        className="h-14 rounded-xl border border-neutral-400 px-4 text-lg"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-14 rounded-xl bg-black text-lg font-semibold text-white disabled:opacity-60"
      >
        {es.login.submit}
      </button>
      {state.message !== null && (
        <p role="status" className={state.sent ? "text-lg text-green-800" : "text-lg text-red-700"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
