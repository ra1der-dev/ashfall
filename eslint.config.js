import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/playwright-report/**", "**/test-results/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // The engine must stay pure: no DOM or Node APIs. Game randomness goes through the seeded Rng.
    files: ["packages/engine/src/**/*.ts"],
    rules: {
      "no-restricted-globals": ["error", "window", "document", "localStorage", "process"],
    },
  },
  {
    files: ["**/*.config.{js,ts}", "apps/web/e2e/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
);
