/**
 * Lower case, no accents, only letters and digits separated by single spaces.
 * Matches how the database search normalises text, so both agree on "the same words".
 */
export function normalizeText(text: string | null | undefined): string {
  if (text === null || text === undefined) {
    return "";
  }
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
