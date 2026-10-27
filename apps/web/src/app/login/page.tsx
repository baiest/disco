import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

const LINK_ERRORS = ["invalid_link", "expired_link"] as const;

function isLinkError(value: string | undefined): value is (typeof LINK_ERRORS)[number] {
  return LINK_ERRORS.some((error) => error === value);
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, t] = await Promise.all([searchParams, getTranslations("login")]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-lg">{t("intro")}</p>
      {isLinkError(error) && (
        <p role="alert" className="text-lg text-red-700">
          {t(`linkError.${error}`)}
        </p>
      )}
      <LoginForm />
    </main>
  );
}
