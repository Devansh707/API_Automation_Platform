// =============================================================================
// FILE: fixtures/test-data.fixture.ts
// PURPOSE: Provides a `seedPost` fixture that creates test data BEFORE a test
//          and cleans it up AFTER — the "Arrange / Act / Assert" pattern automated.
//
// WHEN WOULD YOU USE THIS?
//   Some tests need a resource to already exist before they can test it.
//   Example: testing DELETE /posts/:id requires a post to exist first.
//   Instead of creating the post inside the test (which makes the test longer
//   and mixes "arrange" with "act"), the fixture handles setup/teardown.
//
// HOW IT EXTENDS api.fixture:
//   This fixture LAYERS ON TOP of api.fixture.
//   It gets `apiClient` for free because apiTest already has it.
//   The chain is: base (Playwright) → apiTest (api.fixture) → test (this file)
//
//   When a test uses `seedPost`, Playwright runs:
//     1. api.fixture setup    → creates ApiClient
//     2. test-data.fixture setup → creates a post via API
//     3. THE TEST RUNS
//     4. test-data.fixture teardown → deletes the post via API
//     5. api.fixture teardown       → (nothing, ApiClient is stateless)
//
// HOW TO USE:
//   import { test, expect } from '../../fixtures/test-data.fixture';
//
//   test('delete the seeded post', async ({ apiClient, seedPost }) => {
//     // seedPost is already created — just use its ID
//     const response = await apiClient.delete(`/posts/${seedPost.id}`);
//     expect(response.status()).toBe(200);
//   });
// =============================================================================

import { test as apiTest, expect } from './api.fixture';
import { CreatePostPayload, Post } from '../types/api.types';
import { ENDPOINTS } from '../config/constants';

// Define the shape of the additional fixture this file provides.
type DataFixtures = {
  seedPost: Post; // The created post, available in the test body
};

// Extend apiTest (which already has `apiClient`) with the `seedPost` fixture.
export const test = apiTest.extend<DataFixtures>({

  seedPost: async ({ apiClient }, use) => {
    // ── SETUP ─────────────────────────────────────────────────────────────
    // Define the post payload we want to create.
    // CreatePostPayload = { userId, title, body } (no `id` — server generates it)
    const payload: CreatePostPayload = {
      userId: 1,
      title:  'Seeded Test Post',
      body:   'This post was created by the test fixture',
    };

    // Create the post via the API (POST /posts)
    const createResponse = await apiClient.post(ENDPOINTS.POSTS, payload);

    // Assert creation succeeded — if this fails, the test never starts,
    // which is the correct behaviour (bad setup = don't run the test).
    expect(createResponse.status()).toBe(201);

    // Parse the response to get the full Post object including the server-generated id.
    const created = (await createResponse.json()) as Post;

    // ── HAND TO TEST ───────────────────────────────────────────────────────
    // The test runs here, with `created` available as `seedPost`.
    // Playwright waits at this line until the test body completes.
    await use(created);

    // ── TEARDOWN ───────────────────────────────────────────────────────────
    // Clean up: delete the post after the test finishes (pass or fail).
    // NOTE: JSONPlaceholder is stateless (it doesn't actually delete anything),
    //       but this pattern is critical for real APIs to avoid data pollution.
    await apiClient.delete(`${ENDPOINTS.POSTS}/${created.id}`);
  },
});

// Re-export expect so test files using this fixture still only need one import.
export { expect } from '@playwright/test';
