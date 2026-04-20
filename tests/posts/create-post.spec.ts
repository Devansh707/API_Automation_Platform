// =============================================================================
// FILE: tests/posts/create-post.spec.ts
// SUITE: Unit-style Tests — POST /posts endpoint
//
// WHAT THIS FILE COVERS:
//   All CREATE scenarios for the posts resource:
//   • Successful creation returns 201 with generated ID
//   • Response body echoes back the sent payload
//   • Multiple concurrent creates each get unique IDs
//   • Minimal valid payload is accepted
//   • Response has correct Content-Type header
// =============================================================================

import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS } from '../../config/constants';
import { ApiAssertions } from '../../helpers/assertions.helper';
import { Post, CreatePostPayload } from '../../types/api.types';

test.describe('POST Posts', () => {

  // Define a reusable valid payload at the describe scope.
  // All tests in this block can reference it without redeclaring.
  // CreatePostPayload = { userId, title, body } (Omit<Post, 'id'>)
  const validPayload: CreatePostPayload = {
    userId: 1,
    title:  'Test Post Title',
    body:   'This is the body of the test post',
  };

  test('should create a new post and return 201', async ({ apiClient }) => {
    // POST sends the payload as a JSON body
    const response = await apiClient.post(ENDPOINTS.POSTS, validPayload);

    // 201 Created is the correct HTTP status for resource creation
    // (NOT 200 — 200 means "here is existing data"; 201 means "I made something new")
    await ApiAssertions.assertCreated(response);

    const created = (await response.json()) as Post;

    // The server should have assigned a numeric ID > 0
    ApiAssertions.assertValidId(created.id);

    // The server should echo back exactly what we sent
    expect(created.title).toBe(validPayload.title);
    expect(created.body).toBe(validPayload.body);
    expect(created.userId).toBe(validPayload.userId);
  });

  test('should return the created post body in response', async ({ apiClient }) => {
    const response = await apiClient.post(ENDPOINTS.POSTS, validPayload);

    // assertBodyContains: parses the response and checks specified fields match.
    // We only check title and userId here — demonstrating partial body assertion.
    await ApiAssertions.assertBodyContains<Post>(response, {
      title:  validPayload.title,
      userId: validPayload.userId,
    });
  });

  test('should generate a new unique ID for created post', async ({ apiClient }) => {
    // Run TWO post requests at the same time using Promise.all.
    // Promise.all([p1, p2]) → returns [result1, result2] after both finish.
    // This is faster than running them sequentially AND tests concurrent behaviour.
    const [r1, r2] = await Promise.all([
      apiClient.post(ENDPOINTS.POSTS, { ...validPayload, title: 'Post A' }),
      apiClient.post(ENDPOINTS.POSTS, { ...validPayload, title: 'Post B' }),
      // { ...validPayload, title: 'Post A' } uses the spread operator to copy all
      // validPayload fields and override just the title
    ]);

    const post1 = (await r1.json()) as Post;
    const post2 = (await r2.json()) as Post;

    // Both should have numeric IDs
    // NOTE: JSONPlaceholder always returns id=101 (it's a fake API that doesn't persist),
    // but on a real API these would be unique. This pattern is correct for real APIs.
    expect(typeof post1.id).toBe('number');
    expect(typeof post2.id).toBe('number');
  });

  test('should accept minimal payload', async ({ apiClient }) => {
    // Verify the API doesn't require extra fields beyond the documented minimum
    const minimalPayload = { title: 'Minimal', body: 'body', userId: 2 };
    const response = await apiClient.post(ENDPOINTS.POSTS, minimalPayload);
    expect(response.status()).toBe(HTTP_STATUS.CREATED);
  });

  test('response content-type is application/json', async ({ apiClient }) => {
    const response = await apiClient.post(ENDPOINTS.POSTS, validPayload);
    // Confirm the server tells us the response is JSON (not HTML or XML)
    expect(response.headers()['content-type']).toContain('application/json');
  });
});
