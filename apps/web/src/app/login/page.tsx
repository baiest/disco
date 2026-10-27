import { getTranslations } from "next-intl/server";
import { LoginForm, PasswordForm } from "./login-form";

const LINK_ERRORS = ["invalid_link", "expired_link"] as const;

function isLinkError(value: string | undefined): value is (typeof LINK_ERRORS)[number] {
  return LINK_ERRORS.some((error) => error === value);
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, t] = await Promise.all([searchParams, getTranslations("login")]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 p-4 sm:p-6">
      <svg width="56" height="56" viewBox="0 0 72 72" aria-hidden="true" className="text-accent">
        <circle cx="36" cy="36" r="34" fill="currentColor" />
        <circle cx="36" cy="36" r="24" fill="none" stroke="var(--color-accent-ink)" strokeWidth="1.5" opacity="0.5" />
        <circle cx="36" cy="36" r="14" fill="none" stroke="var(--color-accent-ink)" strokeWidth="1.5" opacity="0.5" />
        <circle cx="36" cy="36" r="6" fill="var(--color-paper)" />
      </svg>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="text-lg text-muted">{t("intro")}</p>
      {isLinkError(error) && (
        <p role="alert" className="text-lg text-danger">
          {t(`linkError.${error}`)}
        </p>
      )}
      <div className="rounded-3xl border border-line bg-card p-5 shadow-[0_8px_30px_rgb(28_25_23/0.08)]">
        <PasswordForm />
      </div>
      <div className="flex flex-col gap-3 rounded-3xl border border-dashed border-field p-5">
        <h2 className="font-display text-xl font-bold">{t("linkTitle")}</h2>
        <p className="text-base text-muted">{t("linkIntro")}</p>
        <LoginForm />
      </div>
    </main>
  );
}
