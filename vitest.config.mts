import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    // Engine tests are pure and run in node. Component tests opt into jsdom
    // with a `// @vitest-environment jsdom` pragma.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/engine/**/*.ts"],
      exclude: ["src/engine/**/*.test.ts", "src/engine/**/__tests__/**", "src/engine/types.ts"],
      thresholds: {
        "src/engine/**": { branches: 95, functions: 95, lines: 95, statements: 95 },
      },
    },
  },
});
