import type { DiscRecord } from "./types";

/** Words the post uses for a record's availability, in the language of the audience. */
export interface FacebookLabels {
  available: string;
  sold: string;
}

const LOCALE = "es";
const QUOTES = new Set(['"', "\u201C", "\u201D"]);

function shout(text: string): string {
  return text.toLocaleUpperCase(LOCALE);
}

/** Removes quotes at both ends in one pass; a regular expression here could be slow on hostile text. */
function stripQuotes(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && QUOTES.has(text.charAt(start))) {
    start += 1;
  }
  while (end > start && QUOTES.has(text.charAt(end - 1))) {
    end -= 1;
  }
  return text.slice(start, end);
}

/**
 * Builds the text of a Facebook post the way the owner writes them: the title in
 * quotes and capitals, the notes line by line, and the availability. The price,
 * the artist and anything else stay out; the owner can edit the text before posting.
 */
export function buildFacebookPost(record: DiscRecord, labels: FacebookLabels): string {
  const lines: string[] = [];

  const title = stripQuotes((record.title ?? "").trim()).trim();
  if (title !== "") {
    lines.push(`"${shout(title)}"`);
  }

  for (const line of (record.notes ?? "").split("\n")) {
    const text = line.trim();
    if (text !== "") {
      lines.push(shout(text));
    }
  }

  if (record.status === "available") {
    lines.push(labels.available);
  } else if (record.status === "sold") {
    lines.push(labels.sold);
  }

  return lines.join("\n");
}
