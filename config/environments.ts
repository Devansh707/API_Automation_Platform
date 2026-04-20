// =============================================================================
// FILE: config/environments.ts
// PURPOSE: Manages environment-specific configuration (URLs, timeouts, etc.)
//
// CONCEPT — "Environment" in testing:
//   The same tests need to run against different servers:
//     • development → your laptop / local server
//     • staging     → pre-production server (mirrors prod)
//     • production  → the real, live system
//     • ci          → GitHub Actions / Jenkins (automated)
//
// HOW IT WORKS:
//   1. You set NODE_ENV=staging in your shell or .env.staging file
//   2. This file reads that value
//   3. Returns the matching config block (staging timeout = 45s, etc.)
//   4. The rest of the framework imports `currentEnv` and uses its values
// =============================================================================

import dotenv from 'dotenv';
import path from 'path';

// Step 1: Read the current environment name.
// process.env.NODE_ENV is a standard Node.js variable.
// Falls back to 'development' if not set — safe default for local work.
const ENV = process.env.NODE_ENV || 'development';

// Step 2: Load environment-specific .env file first (e.g. .env.staging).
// path.resolve builds an absolute path: /project-root/.env.staging
// dotenv.config reads that file and injects its KEY=VALUE pairs into process.env.
dotenv.config({ path: path.resolve(__dirname, '..', `.env.${ENV}`) });

// Step 3: Load the base .env file as a fallback.
// Any variable NOT already set by step 2 gets filled in from .env.
// This means .env.staging values WIN over .env values (dotenv never overwrites).
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ---------------------------------------------------------------------------
// Environment interface — the shape every config block must follow.
// TypeScript enforces this so a missing `timeout` or wrong type is caught
// at build time, not at 2am when tests mysteriously hang.
// ---------------------------------------------------------------------------
export interface Environment {
  baseUrl:  string;                          // Root URL of the API under test
  timeout:  number;                          // Per-request timeout in milliseconds
  retries:  number;                          // How many times to retry a failing test
  logLevel: 'debug' | 'info' | 'warn' | 'error'; // Verbosity of console output
}

// ---------------------------------------------------------------------------
// Config blocks — one per environment.
//
// READING GUIDE:
//   process.env.BASE_URL  → value from the .env file (highest priority)
//   || 'https://...'      → hardcoded fallback if .env didn't set it
//
// WHY DIFFERENT timeouts?
//   CI servers are slower and share resources → give them more time.
//   Local dev is fast → 30s is plenty and keeps feedback quick.
//
// WHY DIFFERENT retries?
//   Development: 0 retries → see failures immediately, fix fast.
//   CI: 2 retries → absorbs occasional network blips on shared infra.
// ---------------------------------------------------------------------------
const environments: Record<string, Environment> = {
  development: {
    baseUrl:  process.env.BASE_URL || 'https://jsonplaceholder.typicode.com',
    timeout:  30000,  // 30 seconds — fast feedback on local machine
    retries:  0,      // No retries — fail fast so you fix the bug now
    logLevel: 'debug', // Show everything, helpful while writing tests
  },
  staging: {
    baseUrl:  process.env.BASE_URL || 'https://jsonplaceholder.typicode.com',
    timeout:  45000,  // 45 seconds — staging server is slower
    retries:  1,      // One retry — absorbs intermittent staging flakiness
    logLevel: 'info', // Less verbose — staging runs are usually automated
  },
  production: {
    baseUrl:  process.env.BASE_URL || 'https://jsonplaceholder.typicode.com',
    timeout:  60000,  // 60 seconds — production may be geographically distant
    retries:  2,      // Two retries — production load means more variance
    logLevel: 'warn', // Only show problems — prod runs are high-signal alerts
  },
  ci: {
    baseUrl:  process.env.BASE_URL || 'https://jsonplaceholder.typicode.com',
    timeout:  60000,  // 60 seconds — Jenkins agents share CPU
    retries:  2,      // Two retries — network in CI is occasionally flaky
    logLevel: 'info', // Moderate verbosity — logs go into build artifacts
  },
};

// ---------------------------------------------------------------------------
// Exported singletons — import these in other files instead of the map above.
//
// ?? (nullish coalescing): if environments[ENV] is undefined (unknown env name),
// fall back to 'development' config rather than crashing.
// ---------------------------------------------------------------------------
export const currentEnv: Environment = environments[ENV] ?? environments['development'];

// Convenience export so files that only need the URL don't have to destructure.
export const BASE_URL = currentEnv.baseUrl;
