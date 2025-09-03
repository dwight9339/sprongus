import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

// ESLint 9+ flat config with TypeScript support
export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      ".pnpm-store/**",
      "eslint.config.*",
    ],
  },

  // Base language options
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.es2021, ...globals.node },
    },
  },

  // Recommended JS rules
  js.configs.recommended,

  // Recommended TS rules with type-checking
  ...tseslint.configs.recommendedTypeChecked,

  // TS-specific parser options
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        // Enable type-aware linting without specifying project paths explicitly
        projectService: true,
      },
    },
  },

  // Keep stylistic rules off and let Prettier handle formatting
  eslintConfigPrettier,
);
