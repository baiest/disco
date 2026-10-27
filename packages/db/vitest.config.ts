import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    globalSetup: ["./src/harness/global-setup.ts"],
    testTimeout: 20_000,
  },
});
