import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  oxc: { jsx: { runtime: "automatic" } },
  // 20s per test: a few tests render every dev-eval offer (about 1.3s alone) and passed the 5s
  // default only when the machine was idle; with 39 parallel workers they timed out at random.
  test: { include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"], testTimeout: 20_000 },
});
