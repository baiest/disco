export interface LocaleHints {
  /** Value of the cookie where the visitor's choice is saved. */
  cookie?: string | undefined;
  /** Value of the Accept-Language request header. */
  acceptLanguage?: string | undefined;
}

interface Preference {
  language: string;
  quality: number;
}

function parseAcceptLanguage(header: string): Preference[] {
  return header
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((param) => /^\s*q=([\d.]+)\s*$/.exec(param)?.[1]).find((value) => value !== undefined);
      return { language: tag.trim().toLowerCase().split("-")[0] ?? "", quality: q === undefined ? 1 : Number(q) };
    })
    .filter((preference) => preference.language !== "" && preference.language !== "*" && preference.quality > 0)
    .sort((a, b) => b.quality - a.quality);
}

/** Picks the interface language: saved choice, then browser preference, then the default. */
export function resolveLocale<L extends string>(hints: LocaleHints, supported: readonly L[], fallback: L): L {
  const isSupported = (value: string): value is L => (supported as readonly string[]).includes(value);

  if (hints.cookie !== undefined && isSupported(hints.cookie)) {
    return hints.cookie;
  }
  for (const { language } of parseAcceptLanguage(hints.acceptLanguage ?? "")) {
    if (isSupported(language)) {
      return language;
    }
  }
  return fallback;
}
