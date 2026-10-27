import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { resolveLocale } from "@/lib/locale";
import { defaultLocale, localeCookie, locales } from "./locales";

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(
    { cookie: cookieStore.get(localeCookie)?.value, acceptLanguage: headerStore.get("accept-language") ?? undefined },
    locales,
    defaultLocale,
  );

  const loaded = (await import(`../../messages/${locale}.json`)) as { default: Record<string, unknown> };

  // `.default` is the plain JSON object; the module namespace itself cannot be passed to client components.
  return { locale, messages: loaded.default };
});
