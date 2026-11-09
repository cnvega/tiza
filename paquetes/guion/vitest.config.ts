import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/tipos.ts"],
      reporter: ["text-summary", "text"],
      // Definición de terminado (coordinación, sección 7): cobertura ≥ 80 % en guion.
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
});
