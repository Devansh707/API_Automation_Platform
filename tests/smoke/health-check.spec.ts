// =============================================================================
// FILE: tests/smoke/health-check.spec.ts
// SUITE: Smoke Tests
//
// WHAT ARE SMOKE TESTS?
//   "Smoke test" comes from hardware engineering: turn on a circuit board and
//   check if smoke appears before doing deeper testing. In software, a smoke
//   test answers one question: "Is the system basically alive?"
//
// PURPOSE:
//   Verify the API is reachable and returns HTTP 200 for the main resources.
//   These tests run FIRST in the Jenkins pipeline. If they fail, the pipeline
//   aborts immediately — no point running 500 deeper tests against a down server.
//
// WHAT IS TESTED:
//   • GET /posts    → returns 200 with a non-empty array
//   • GET /users    → returns 200 with a non-empty array
//   • GET /comments → returns 200
//   • GET /albums   → returns 200
//
// WHAT IS NOT TESTED (left for sanity/regression):
//   • Response body schema
//   • Status codes other than 200
//   • Data relationships
// =============================================================================

// Import our extended test object (has `apiClient`) and expect from the fixture.
// Using the fixture means we never manually create or destroy the HTTP client.
import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS } from '../../config/constants';

// test.describe groups related tests under a label.
// In the HTML reporter and terminal output, you'll see:
//   Smoke: API Health Checks
//     ✓ GET /posts returns 200 and non-empty array
//     ✓ GET /users returns 200 and non-empty array
//     ...
test.describe('Smoke: API Health Checks', () => {

  // Each `test()` call is one test case.
  // The function receives { apiClient } — destructured from the fixture.
  // `async` is required because all API calls return Promises.

  test('GET /posts returns 200 and non-empty array', async ({ apiClient }) => {
    // Make the HTTP request — apiClient adds logging and uses baseURL automatically
    const response = await apiClient.get(ENDPOINTS.POSTS);

    // Assert the HTTP status code is 200
    expect(response.status()).toBe(HTTP_STATUS.OK);

    // Parse the JSON body — response.json() returns Promise<unknown>
    // We cast to unknown[] since we know the API returns an array
    const body = (await response.json()) as unknown[];

    // Verify it's actually an array (not an object or null)
    expect(Array.isArray(body)).toBe(true);

    // Verify the array is not empty — the API should always have data
    expect(body.length).toBeGreaterThan(0);
  });

  test('GET /users returns 200 and non-empty array', async ({ apiClient }) => {
    const response = await apiClient.get(ENDPOINTS.USERS);
    expect(response.status()).toBe(HTTP_STATUS.OK);
    const body = (await response.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('GET /comments returns 200', async ({ apiClient }) => {
    // Smoke test — we only care that the endpoint responds, not the body content.
    // Body validation is done in regression tests.
    const response = await apiClient.get(ENDPOINTS.COMMENTS);
    expect(response.status()).toBe(HTTP_STATUS.OK);
  });

  test('GET /albums returns 200', async ({ apiClient }) => {
    const response = await apiClient.get(ENDPOINTS.ALBUMS);
    expect(response.status()).toBe(HTTP_STATUS.OK);
  });
});
