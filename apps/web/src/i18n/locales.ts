/** Languages the interface is available in. To add one: create messages/<code>.json and list it here. */
export const locales = ["es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";
export const localeCookie = "NEXT_LOCALE";
