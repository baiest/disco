import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { signOut } from "./actions";

export default async function AdminPage() {
  const [supabase, t] = await Promise.all([createSupabaseServerClient(), getTranslations("admin")]);
  const { data } = await supabase.auth.getUser();
  if (data.user === null) {
    // The proxy already redirects; this check keeps the page safe on its own.
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-lg">{t("signedInAs", { email: data.user.email ?? "" })}</p>
      <Link
        href="/admin/records/new"
        className="flex h-16 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-accent-ink"
      >
        {t("addRecord")}
      </Link>
      <form action={signOut}>
        <button type="submit" className="h-14 w-full rounded-2xl border-2 border-ink text-lg font-semibold">
          {t("signOut")}
        </button>
      </form>
    </main>
  );
}
