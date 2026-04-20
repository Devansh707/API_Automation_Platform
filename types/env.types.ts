// =============================================================================
// FILE: types/env.types.ts
// PURPOSE: Teaches TypeScript what environment variables this project uses.
//
// THE PROBLEM THIS SOLVES:
//   By default, process.env.ANYTHING returns `string | undefined`.
//   That means TypeScript allows process.env.NODE_ENV === 'typo' with no warning.
//
// THE SOLUTION — Declaration Merging:
//   TypeScript allows you to "add" properties to existing interfaces using
//   `declare global`. Here we extend the built-in NodeJS.ProcessEnv interface
//   to list our specific variables with their allowed values.
//
// AFTER THIS FILE:
//   process.env.NODE_ENV === 'typo'        ← TypeScript ERROR (not in union)
//   process.env.NODE_ENV === 'staging'     ← TypeScript OK
//   process.env.UNKNOWN_VAR               ← Still string | undefined (not declared)
//
// NOTE: The `export {}` at the bottom is required to make this a "module"
//       (a file with imports/exports). Without it, `declare global` wouldn't work.
// =============================================================================

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Which environment is active — controls which config block is loaded.
      // Optional (?) because it may not be set; code defaults to 'development'.
      NODE_ENV?: 'development' | 'staging' | 'production' | 'ci';

      // Override the API base URL without changing code.
      // Example: BASE_URL=http://localhost:3000 npm test
      BASE_URL?: string;

      // Set to "true" to activate Allure reporter for rich HTML test reports.
      // String type because all env vars are strings; checked with === 'true'.
      ALLURE_RESULTS?: string;

      // Set by CI systems (Jenkins, GitHub Actions) automatically.
      // When "true", Playwright enables retries and parallel workers.
      CI?: string;
    }
  }
}

// Required to make TypeScript treat this file as a module (not a script).
export {};
