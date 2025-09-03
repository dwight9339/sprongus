import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.{test,spec}.ts"],
    environment: "node",
    globals: false,
    passWithNoTests: true,
    reporters: ["default"],
    coverage: { enabled: false },
    // Run in a VM-based pool to avoid sandbox IPC restrictions
    pool: "vmThreads",
  },
});
