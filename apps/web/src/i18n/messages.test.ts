import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(import.meta.dirname, "../../messages");
const files = readdirSync(dir).filter((file) => file.endsWith(".json"));

type Tree = { [key: string]: string | Tree };

function load(file: string): Tree {
  return JSON.parse(readFileSync(join(dir, file), "utf8")) as Tree;
}

/** Flattens a message tree into "path.to.key" -> text. */
function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof value === "string") {
      result.set(path, value);
    } else {
      for (const [childPath, text] of flatten(value, path)) {
        result.set(childPath, text);
      }
    }
  }
  return result;
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)/g)].map((match) => match[1] ?? "").sort();
}

describe("message files", () => {
  const reference = flatten(load("es.json"));

  it("has the Spanish reference file", () => {
    expect(files).toContain("es.json");
    expect(reference.size).toBeGreaterThan(0);
  });

  it.each(files)("%s has no empty text", (file) => {
    for (const [key, text] of flatten(load(file))) {
      expect(text.trim(), key).not.toBe("");
    }
  });

  it.each(files)("%s has exactly the same keys as es.json", (file) => {
    const keys = [...flatten(load(file)).keys()].sort();
    expect(keys).toEqual([...reference.keys()].sort());
  });

  it.each(files)("%s uses the same placeholders as es.json in every text", (file) => {
    for (const [key, text] of flatten(load(file))) {
      expect(placeholders(text), key).toEqual(placeholders(reference.get(key) ?? ""));
    }
  });
});
