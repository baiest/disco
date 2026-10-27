import type { DiscRecord } from "./types";

/** Words the post uses for a record's availability, in the language of the audience. */
export interface FacebookLabels {
  available: string;
  sold: string;
}

const LOCALE = "es";

function shout(text: string): string {
  return text.toLocaleUpperCase(LOCALE);
}

/**
 * Builds the text of a Facebook post the way the owner writes them: the title in
 * quotes and capitals, the notes line by line, and the availability. The price,
 * the artist and anything else stay out; the owner can edit the text before posting.
 */
export function buildFacebookPost(record: DiscRecord, labels: FacebookLabels): string {
  const lines: string[] = [];

  const title = (record.title ?? "").trim().replace(/^["“”]+|["“”]+$/g, "").trim();
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
