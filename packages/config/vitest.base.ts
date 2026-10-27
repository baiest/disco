import { defineConfig } from "vitest/config";

interface Options {
  include: string[];
  environment?: "node" | "jsdom";
}

/** Shared Vitest config: 80% thresholds on every metric (see AGENTS.md section 7). */
export function createVitestConfig({ include, environment = "node" }: Options) {
  return defineConfig({
    test: {
      environment,
      include: ["src/**/*.test.{ts,tsx}"],
      passWithNoTests: true,
      coverage: {
        provider: "v8",
        include,
        exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts"],
        reporter: ["text", "lcov"],
        thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
      },
    },
  });
}
