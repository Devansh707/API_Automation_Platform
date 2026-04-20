// =============================================================================
// FILE: fixtures/api.fixture.ts
// PURPOSE: Defines the `apiClient` test fixture — the bridge between Playwright's
//          request context and our ApiClient wrapper.
//
// WHAT IS A FIXTURE?
//   A fixture is something that is SET UP before a test and TORN DOWN after it.
//   Classic examples: start a database → run test → rollback database.
//
//   Playwright fixtures work differently from setup/teardown functions:
//   they are INJECTED into tests as function arguments. The test file never
//   creates or destroys the fixture manually — Playwright does it automatically.
//
// HOW test.extend() WORKS:
//   base.extend({ myFixture: async ({ dep }, use) => { ... } })
//   │                │         │     └─ `use(value)` = "here is the fixture value,
//   │                │         │         run the test now, then come back here"
//   │                │         └─ `dep` = other fixtures this one depends on
//   │                └─ new fixture name
//   └─ original test object from Playwright
//
//   Everything BEFORE `await use(client)` = SETUP (runs before the test)
//   Everything AFTER  `await use(client)` = TEARDOWN (runs after the test)
//   This file has no teardown — ApiClient is stateless (no open connections).
//
// HOW TO USE IN A TEST FILE:
//   import { test, expect } from '../../fixtures/api.fixture';
//   //       ↑ our extended test  ↑ re-exported expect
//
//   test('my test', async ({ apiClient }) => {  // ← apiClient auto-injected
//     const response = await apiClient.get('/posts');
//   });
// =============================================================================

import { test as base } from '@playwright/test';
import { ApiClient } from '../helpers/api.client';

// Define the shape of our custom fixtures.
// TypeScript uses this to type-check { apiClient } destructuring in test args.
type ApiFixtures = {
  apiClient: ApiClient;
};

// Extend the base Playwright test object with our ApiClient fixture.
// `request` is a built-in Playwright fixture that provides APIRequestContext.
// We wrap it in our ApiClient and pass it to the test via `use()`.
export const test = base.extend<ApiFixtures>({
  apiClient: async ({ request }, use) => {
    // SETUP: create our ApiClient, wrapping Playwright's raw request context
    const client = new ApiClient(request);

    // Hand the client to the test — the test runs here.
    // Execution pauses at this line until the test finishes.
    await use(client);

    // TEARDOWN: nothing to clean up — ApiClient holds no state.
    // (If we had opened a DB connection or started a server, we'd close it here.)
  },
});

// Re-export `expect` from Playwright so test files only need ONE import line:
//   import { test, expect } from '../../fixtures/api.fixture';
// instead of importing from two different places.
export { expect } from '@playwright/test';
