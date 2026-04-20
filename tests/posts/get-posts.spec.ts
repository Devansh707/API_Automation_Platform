// =============================================================================
// FILE: tests/posts/get-posts.spec.ts
// SUITE: Unit-style Tests — GET /posts endpoint
//
// WHAT THIS FILE COVERS:
//   All READ scenarios for the posts resource:
//   • Listing all posts
//   • Fetching a single post by ID
//   • 404 when the post doesn't exist
//   • Filtering posts by userId
//   • Schema validation (correct fields and types)
//   • Response headers (Content-Type)
// =============================================================================

import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS, LIMITS } from '../../config/constants';
import { ApiAssertions } from '../../helpers/assertions.helper';
import { Post } from '../../types/api.types';

test.describe('GET Posts', () => {

  test('should fetch all posts', async ({ apiClient }) => {
    const response = await apiClient.get(ENDPOINTS.POSTS);

    // Use the helper assertion — readable and includes a good error message
    await ApiAssertions.assertOk(response);

    const posts = (await response.json()) as Post[];

    // assertPaginatedResponse checks: length > 0 AND length <= LIMITS.MAX_POSTS
    ApiAssertions.assertPaginatedResponse(posts, LIMITS.MAX_POSTS);

    // JSONPlaceholder always returns exactly 100 posts — assert the exact count
    expect(posts).toHaveLength(LIMITS.MAX_POSTS);
  });

  test('should fetch a single post by ID', async ({ apiClient }) => {
    const response = await apiClient.get(`${ENDPOINTS.POSTS}/1`);
    await ApiAssertions.assertOk(response);

    const post = (await response.json()) as Post;

    // Verify identity — we asked for post #1, we should get post #1
    expect(post.id).toBe(1);

    // toHaveProperty(key) checks the field EXISTS (any value)
    // vs toHaveProperty(key, value) which checks EXISTS + equals value
    expect(post).toHaveProperty('userId');
    expect(post).toHaveProperty('title');
    expect(post).toHaveProperty('body');

    // assertValidId: typeof id === 'number' AND id > 0
    ApiAssertions.assertValidId(post.id);
  });

  test('should return 404 for non-existent post', async ({ apiClient }) => {
    // 99999 doesn't exist in JSONPlaceholder — should get 404
    const response = await apiClient.get(`${ENDPOINTS.POSTS}/99999`);
    await ApiAssertions.assertNotFound(response);
  });

  test('should filter posts by userId query param', async ({ apiClient }) => {
    const userId = 1;

    // ?userId=1 filters the list to only posts from user #1
    const response = await apiClient.get(ENDPOINTS.POSTS, { params: { userId } });
    await ApiAssertions.assertOk(response);

    const posts = (await response.json()) as Post[];
    ApiAssertions.assertArrayNotEmpty(posts);

    // Data integrity: every returned post MUST belong to userId=1
    // If even one has a different userId, the API's filter is broken
    posts.forEach((post) => {
      expect(post.userId).toBe(userId);
    });
  });

  test('should return posts with correct schema fields', async ({ apiClient }) => {
    // getJson<Post> = GET + assert 200 + parse JSON in one call
    const post = await apiClient.getJson<Post>(`${ENDPOINTS.POSTS}/1`);

    // toMatchObject checks that the object has AT LEAST these fields
    // with the specified types (using expect.any() matchers).
    // It does NOT fail if there are extra fields — flexible schema check.
    expect(post).toMatchObject({
      id:     expect.any(Number),  // id must be a number (any number)
      userId: expect.any(Number),
      title:  expect.any(String),
      body:   expect.any(String),
    });
  });

  test('should return 200 with valid content-type', async ({ apiClient }) => {
    const response = await apiClient.get(ENDPOINTS.POSTS);
    expect(response.status()).toBe(HTTP_STATUS.OK);

    // response.headers() returns all HTTP headers as an object.
    // Content-Type tells us the format of the response body.
    // We use toContain because the full value might be 'application/json; charset=utf-8'
    expect(response.headers()['content-type']).toContain('application/json');
  });
});
