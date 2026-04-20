// =============================================================================
// FILE: tests/integration/user-posts-flow.spec.ts
// SUITE: Integration Tests — User → Posts & Albums relationship
//
// THIS FILE TESTS:
//   The relationship between /users, /posts, and /albums.
//   A Post has a `userId` field. An Album also has a `userId` field.
//   We verify that querying by userId returns only that user's resources.
//
// KEY CONCEPTS DEMONSTRATED:
//   1. Promise.all — run multiple requests in parallel
//   2. Foreign key validation — userId in posts matches the user's id
//   3. Cross-endpoint consistency — /users/:id/posts vs /posts?userId=:id
// =============================================================================

import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS } from '../../config/constants';
import { User, Post, Album } from '../../types/api.types';

test.describe('Integration: User → Posts & Albums Flow', () => {

  test('posts fetched by userId belong to the user', async ({ apiClient }) => {
    const userId = 1;

    // Step 1: Verify the user exists
    const userResponse = await apiClient.get(`${ENDPOINTS.USERS}/${userId}`);
    expect(userResponse.status()).toBe(HTTP_STATUS.OK);
    const user = (await userResponse.json()) as User;

    // Step 2: Get all posts for this user using the query parameter filter
    const postsResponse = await apiClient.get(ENDPOINTS.POSTS, {
      params: { userId }, // appends ?userId=1 to the URL
    });
    expect(postsResponse.status()).toBe(HTTP_STATUS.OK);
    const posts = (await postsResponse.json()) as Post[];

    // Step 3: Verify the relationship — every post.userId must equal user.id
    // If the filter is broken, some posts from other users would leak through
    expect(posts.length).toBeGreaterThan(0);
    posts.forEach((post) => {
      expect(post.userId).toBe(user.id);
    });
  });

  test('nested /users/:id/posts returns same posts as query param filter', async ({ apiClient }) => {
    const userId = 2;

    // Run both access patterns simultaneously — saves time, proves consistency
    const [nestedResponse, queryResponse] = await Promise.all([
      apiClient.get(`${ENDPOINTS.USERS}/${userId}/posts`),        // hierarchical URL
      apiClient.get(ENDPOINTS.POSTS, { params: { userId } }),     // filter URL
    ]);

    expect(nestedResponse.status()).toBe(HTTP_STATUS.OK);
    expect(queryResponse.status()).toBe(HTTP_STATUS.OK);

    const nestedPosts = (await nestedResponse.json()) as Post[];
    const queryPosts  = (await queryResponse.json()) as Post[];

    // Both routes should return the same posts count
    expect(nestedPosts.length).toBe(queryPosts.length);

    // And all posts should belong to the requested user
    nestedPosts.forEach((post) => {
      expect(post.userId).toBe(userId);
    });
  });

  test('user albums all belong to the correct user', async ({ apiClient }) => {
    const userId = 1;

    // Use the nested route: /users/1/albums
    const albumsResponse = await apiClient.get(`${ENDPOINTS.USERS}/${userId}/albums`);
    expect(albumsResponse.status()).toBe(HTTP_STATUS.OK);
    const albums = (await albumsResponse.json()) as Album[];

    expect(albums.length).toBeGreaterThan(0);
    // Verify every album's userId matches — same pattern as post ownership check
    albums.forEach((album) => {
      expect(album.userId).toBe(userId);
    });
  });

  test('user has both posts and albums (data consistency)', async ({ apiClient }) => {
    const userId = 3;

    // Fetch posts and albums for the same user simultaneously
    // If either is empty, there's a data integrity issue for this user
    const [postsResponse, albumsResponse] = await Promise.all([
      apiClient.get(`${ENDPOINTS.USERS}/${userId}/posts`),
      apiClient.get(`${ENDPOINTS.USERS}/${userId}/albums`),
    ]);

    const posts  = (await postsResponse.json())  as Post[];
    const albums = (await albumsResponse.json()) as Album[];

    // A complete user should have both posts and albums
    expect(posts.length).toBeGreaterThan(0);
    expect(albums.length).toBeGreaterThan(0);
  });
});
