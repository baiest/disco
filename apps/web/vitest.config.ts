import { fileURLToPath } from "node:url";
import { createVitestConfig } from "@disco/config/vitest";
import { mergeConfig } from "vitest/config";

const base = createVitestConfig({ include: ["src/lib/**/*.{ts,tsx}", "src/components/**/*.tsx"], environment: "jsdom" });

export default mergeConfig(base, {
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
