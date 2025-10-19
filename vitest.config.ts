import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@sprongus/core",
        replacement: fileURLToPath(
          new URL("./packages/core/src/index.ts", import.meta.url),
        ),
      },
      {
        find: "@sprongus/core/",
        replacement: fileURLToPath(
          new URL("./packages/core/src/", import.meta.url),
        ),
      },
      {
        find: "@sprongus/db",
        replacement: fileURLToPath(
          new URL("./packages/db/src/index.ts", import.meta.url),
        ),
      },
      {
        find: "@sprongus/db/",
        replacement: fileURLToPath(
          new URL("./packages/db/src/", import.meta.url),
        ),
      },
    ],
  },
  test: {
    include: ["**/*.{test,spec}.ts"],
    environment: "node",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
    reporters: ["default"],
    coverage: { enabled: false },
    // Run in a VM-based pool to avoid sandbox IPC restrictions
    pool: "vmThreads",
  },
});
