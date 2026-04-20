// =============================================================================
// FILE: tests/posts/delete-post.spec.ts
// SUITE: Unit-style Tests — DELETE /posts/:id
//
// WHAT THIS FILE COVERS:
//   • Deleting an existing post returns 200
//   • Response body on delete is an empty object {}
//   • Deleting a non-existent resource returns 404
//   • Multiple concurrent deletes all succeed
//
// NOTE ON STATUS CODES:
//   JSONPlaceholder returns 200 {} on DELETE (unusual but correct for this fake API).
//   Many real APIs return 204 No Content (no body at all) for DELETE.
//   Always check your API's documentation — don't assume!
// =============================================================================

import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS } from '../../config/constants';

test.describe('DELETE Posts', () => {

  test('should delete an existing post and return 200', async ({ apiClient }) => {
    // DELETE /posts/1 — tells the server to remove post #1
    const response = await apiClient.delete(`${ENDPOINTS.POSTS}/1`);

    // JSONPlaceholder responds with 200 on DELETE (some APIs use 204 instead)
    expect(response.status()).toBe(HTTP_STATUS.OK);
  });

  test('should return empty object body after delete', async ({ apiClient }) => {
    const response = await apiClient.delete(`${ENDPOINTS.POSTS}/1`);
    expect(response.status()).toBe(HTTP_STATUS.OK);

    // Parse the response body and verify it's exactly {}
    // toEqual({}) checks deep equality — {} means no properties at all
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({});
    // Note: toEqual vs toBe:
    //   toBe uses === (reference equality) — {} === {} is FALSE (different objects)
    //   toEqual checks deep value equality — {} equals {} (same shape)
  });

  test('should return 404 when deleting non-existent post', async ({ apiClient }) => {
    // Trying to delete something that doesn't exist should fail cleanly with 404
    const response = await apiClient.delete(`${ENDPOINTS.POSTS}/99999`);
    expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND);
  });

  test('multiple deletes on same resource all return 200', async ({ apiClient }) => {
    // Run both deletes simultaneously — tests that the API handles concurrent requests
    // In a real (persistent) API, the second delete might return 404 after the first
    // succeeds. JSONPlaceholder is stateless so both return 200.
    const [r1, r2] = await Promise.all([
      apiClient.delete(`${ENDPOINTS.POSTS}/1`),
      apiClient.delete(`${ENDPOINTS.POSTS}/2`),
    ]);
    expect(r1.status()).toBe(HTTP_STATUS.OK);
    expect(r2.status()).toBe(HTTP_STATUS.OK);
  });
});
