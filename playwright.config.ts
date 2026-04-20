// =============================================================================
// FILE: playwright.config.ts
// PURPOSE: Master configuration for the Playwright test runner.
//          This is the first file Playwright reads when you run `npx playwright test`.
//
// WHAT THIS FILE CONTROLS:
//   • Where to find test files (testDir)
//   • How long tests are allowed to run (timeout)
//   • Whether to retry on failure (retries)
//   • How many tests run in parallel (workers)
//   • What the API's base URL is (use.baseURL)
//   • Which report formats to generate (reporter)
//   • Named groups of tests called "projects" (projects)
//
// KEY CONCEPT — baseURL:
//   When baseURL is set to 'https://jsonplaceholder.typicode.com',
//   all requests in tests use paths only:
//     apiClient.get('/posts')   → actually calls GET https://jsonplaceholder.typicode.com/posts
//   This means you change one line here to point the entire suite at a different server.
// =============================================================================

import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env files before any config values are read.
// This must happen at the TOP of this file, before the defineConfig() call,
// so that process.env.BASE_URL is populated when the `use.baseURL` line runs.
const ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(__dirname, `.env.${ENV}`) }); // e.g. .env.staging
dotenv.config({ path: path.resolve(__dirname, '.env') });         // fallback base .env

export default defineConfig({

  // ---------------------------------------------------------------------------
  // testDir — folder where Playwright scans for test files.
  // It looks recursively for files matching *.spec.ts by default.
  // ---------------------------------------------------------------------------
  testDir: './tests',

  // ---------------------------------------------------------------------------
  // timeout — maximum time (ms) a single test is allowed to run.
  // 30_000 = 30 seconds. The underscore is just a readability separator (JS feature).
  // If a test takes longer, Playwright marks it as failed with "Test timeout exceeded".
  // ---------------------------------------------------------------------------
  timeout: 30_000,

  // ---------------------------------------------------------------------------
  // retries — how many times to re-run a failing test before marking it as failed.
  //
  // process.env.CI is set to "true" automatically by Jenkins / GitHub Actions.
  // In CI: retry twice (handles network blips on shared infrastructure).
  // Locally: no retries (see failures immediately, fix them faster).
  // ---------------------------------------------------------------------------
  retries: process.env.CI ? 2 : 0,

  // ---------------------------------------------------------------------------
  // workers — how many tests to run in parallel (in separate processes).
  //
  // CI: 4 workers → 4 tests run simultaneously → faster pipeline.
  // Local: undefined → Playwright chooses based on your CPU core count.
  //
  // API tests are safe to parallelise because each test is independent:
  // no shared database state, no browser UI, no file locks.
  // ---------------------------------------------------------------------------
  workers: process.env.CI ? 4 : undefined,

  // ---------------------------------------------------------------------------
  // fullyParallel — allow tests WITHIN the same file to run in parallel.
  // By default, tests in one file run sequentially. This removes that restriction.
  // Safe for API tests because they don't share state.
  // ---------------------------------------------------------------------------
  fullyParallel: true,

  // ---------------------------------------------------------------------------
  // reporter — which output formats to generate after the test run.
  //
  // 'list'   → prints each test result to the terminal as it finishes
  // 'html'   → generates a rich clickable HTML report in playwright-report/
  //            open: 'never' means it won't auto-open a browser (good for CI)
  // 'junit'  → XML file in JUnit format — Jenkins reads this to show test results
  //            in its dashboard and trend graphs
  // 'allure' → conditionally added if ALLURE_RESULTS=true env var is set.
  //            Allure produces very rich reports with history, timings, and attachments.
  //            We make it opt-in to keep basic runs fast.
  // ---------------------------------------------------------------------------
  reporter: [
    ['list'],
    ['html',  { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile:   'reports/junit-results.xml' }],
    ...(process.env.ALLURE_RESULTS === 'true'
      ? [['allure-playwright', { resultsDir: 'allure-results' }] as const]
      : []),
  ],

  // ---------------------------------------------------------------------------
  // use — shared settings applied to ALL tests unless overridden in a project.
  // ---------------------------------------------------------------------------
  use: {
    // baseURL: the root of the API. All requests use paths relative to this.
    // e.g. apiClient.get('/posts') → GET https://jsonplaceholder.typicode.com/posts
    baseURL: process.env.BASE_URL || 'https://jsonplaceholder.typicode.com',

    // extraHTTPHeaders: sent with every request automatically.
    // 'Content-Type: application/json' → tells the server our body is JSON.
    // 'Accept: application/json'       → tells the server we want JSON back.
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
    },

    // trace: 'on-first-retry' → Playwright records a detailed trace
    // (network requests, timeline, console) only when a test is being RETRIED.
    // This gives you debugging data for flaky tests without overhead on passes.
    trace: 'on-first-retry',

    // ignoreHTTPSErrors: false → if the server has an invalid SSL cert, FAIL.
    // Set to true only if testing against a staging server with a self-signed cert.
    ignoreHTTPSErrors: false,
  },

  // ---------------------------------------------------------------------------
  // projects — named groups of tests that can be run independently.
  //
  // WHY PROJECTS?
  //   Running ALL tests every time is slow. Projects let you run a targeted
  //   subset depending on context:
  //     CI step 1: run 'smoke'       → fast gate, ~5 seconds
  //     CI step 2: run 'sanity'      → happy paths, ~15 seconds
  //     CI step 3: run 'integration' → cross-resource flows
  //     CI step 4: run 'regression'  → full coverage
  //     Local dev:  run 'all'        → everything
  //
  // testMatch uses glob patterns:
  //   '**/smoke/**/*.spec.ts' → any .spec.ts file inside any 'smoke' folder
  // ---------------------------------------------------------------------------
  projects: [
    {
      name:      'smoke',
      testMatch: '**/smoke/**/*.spec.ts',
      // Purpose: verify the API is reachable and returns HTTP 200.
      // Run first in Jenkins to abort early if the server is down.
    },
    {
      name:      'sanity',
      testMatch: '**/sanity/**/*.spec.ts',
      // Purpose: happy-path check per resource — one GET, one POST per entity.
      // Run second to confirm basic CRUD works before deeper testing.
    },
    {
      name:      'integration',
      testMatch: '**/integration/**/*.spec.ts',
      // Purpose: verify cross-resource relationships (post → its comments, user → albums).
      // These tests call multiple endpoints in sequence, testing data consistency.
    },
    {
      name:      'regression',
      testMatch: '**/regression/**/*.spec.ts',
      // Purpose: exhaustive CRUD + edge cases per resource.
      // Run last — most comprehensive, most time-consuming.
    },
    {
      name:      'all',
      testMatch: '**/*.spec.ts',
      // Purpose: run everything in one go (useful for local pre-commit checks).
    },
  ],
});
