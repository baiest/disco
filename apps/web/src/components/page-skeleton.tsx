import { useTranslations } from "next-intl";

/**
 * What a screen shows the instant it is tapped, while the real one is still being prepared on the server,
 * so a tap never looks like it did nothing.
 */
export function PageSkeleton() {
  const t = useTranslations("common");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-4">
      <div role="status" aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">{t("loading")}</span>
        <div className="h-10 w-2/3 animate-pulse rounded-xl bg-line" />
        <div className="h-14 animate-pulse rounded-2xl bg-line" />
        <ul className="flex flex-col gap-3" aria-hidden="true">
          {[0, 1, 2, 3].map((slot) => (
            <li key={slot} className="h-24 animate-pulse rounded-3xl bg-line" />
          ))}
        </ul>
      </div>
    </main>
  );
}
