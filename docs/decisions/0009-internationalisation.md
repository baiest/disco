# 0009: Internationalisation with next-intl

Status: accepted

## Context

The interface is Spanish only today, but an English version is planned. Text
with data, plurals and number formats are what make late translation painful.

## Decision

- Use `next-intl` without locale-prefixed URLs. The language comes from the
  `NEXT_LOCALE` cookie, then `Accept-Language`, then Spanish. URLs do not change,
  so the login and the admin guard are unaffected.
- All UI text lives in `apps/web/messages/<locale>.json`, with typed keys taken
  from `es.json`. Data goes in as ICU placeholders; no concatenation.
- Server actions return status codes and the UI translates them.
- A test checks that every locale file has the same keys and placeholders as
  `es.json`, so a half-translated file cannot be merged.
- Adding a language is a new JSON file plus one line in `src/i18n/locales.ts`.

## Consequences

- One new dependency (`next-intl`), justified by the planned second language.
- Prices still use `formatPrice` from `packages/domain` ("$80.000", Colombian
  style). When prices appear in the UI they should be formatted with the locale
  and the COP currency instead; `parsePrice` also accepts "80 mil", a Spanish
  input form. Revisit both in DISCO-5 and DISCO-6 when adding English.
- If the public catalog needs per-language URLs for sharing and SEO (Phase 2),
  locale-prefixed routing can be added then.
- The build does not catch a wrong messages loader: the app compiled while
  returning a 500 at runtime. End-to-end checks in DISCO-7 should load each page.
