import { createVitestConfig } from "@disco/config/vitest";

export default createVitestConfig({ include: ["src/lib/**/*.{ts,tsx}"], environment: "jsdom" });
