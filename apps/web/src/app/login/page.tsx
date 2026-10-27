import { es } from "@/copy/es";
import { LoginForm } from "./login-form";

const LINK_ERRORS: Record<string, string> = {
  invalid_link: es.login.invalidLink,
  expired_link: es.login.expiredLink,
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const linkError = error === undefined ? undefined : LINK_ERRORS[error];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">{es.login.title}</h1>
      <p className="text-lg">{es.login.intro}</p>
      {linkError !== undefined && (
        <p role="alert" className="text-lg text-red-700">
          {linkError}
        </p>
      )}
      <LoginForm />
    </main>
  );
}
