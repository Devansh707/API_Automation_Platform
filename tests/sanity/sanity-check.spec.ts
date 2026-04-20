// =============================================================================
// FILE: tests/sanity/sanity-check.spec.ts
// SUITE: Sanity Tests
//
// WHAT ARE SANITY TESTS?
//   After smoke tests confirm the server is alive, sanity tests confirm that
//   the CORE FUNCTIONALITY works. One happy-path test per resource.
//   "Can I read a post? Create a post? Delete a post? Read a user? A comment?"
//
// DIFFERENCE FROM SMOKE:
//   Smoke  → "Is the server alive?" (just HTTP 200 on list endpoints)
//   Sanity → "Does basic CRUD work?" (individual resources, POST, DELETE)
//
// DIFFERENCE FROM REGRESSION:
//   Sanity    → one happy-path per operation (fast, ~15 seconds total)
//   Regression → all operations + every edge case (thorough, ~60 seconds)
//
// RUN ORDER IN CI PIPELINE:
//   Smoke → Sanity → Integration → Regression
// =============================================================================

import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS } from '../../config/constants';
import { Post, User, Comment } from '../../types/api.types';

test.describe('Sanity: Happy Path per Resource', () => {

  // ── POST SANITY ────────────────────────────────────────────────────────────

  test('GET /posts/1 returns correct post', async ({ apiClient }) => {
    // Get a single post by its ID.
    // The /1 part is the resource identifier — tells the server "give me post #1".
    const response = await apiClient.get(`${ENDPOINTS.POSTS}/1`);

    expect(response.status()).toBe(HTTP_STATUS.OK);

    // Parse the JSON body and tell TypeScript it should be a Post object.
    // TypeScript now knows post.id, post.title, etc. exist.
    const post = (await response.json()) as Post;

    // Verify the returned post is actually post #1
    expect(post.id).toBe(1);

    // Verify key fields exist (toHaveProperty checks the key exists, not the value)
    expect(post).toHaveProperty('userId');
    expect(post).toHaveProperty('title');
    expect(post).toHaveProperty('body');
  });

  // ── USER SANITY ────────────────────────────────────────────────────────────

  test('GET /users/1 returns correct user', async ({ apiClient }) => {
    const response = await apiClient.get(`${ENDPOINTS.USERS}/1`);
    expect(response.status()).toBe(HTTP_STATUS.OK);

    const user = (await response.json()) as User;
    expect(user.id).toBe(1);
    // typeof check — ensures these fields are strings, not null/undefined/numbers
    expect(typeof user.name).toBe('string');
    expect(typeof user.email).toBe('string');
  });

  // ── COMMENT SANITY ─────────────────────────────────────────────────────────

  test('GET /comments/1 returns correct comment', async ({ apiClient }) => {
    const response = await apiClient.get(`${ENDPOINTS.COMMENTS}/1`);
    expect(response.status()).toBe(HTTP_STATUS.OK);

    const comment = (await response.json()) as Comment;
    expect(comment.id).toBe(1);
    // Comments are linked to posts via postId — verify that link exists
    expect(comment).toHaveProperty('postId');
    expect(comment).toHaveProperty('email');
  });

  // ── CREATE SANITY ──────────────────────────────────────────────────────────

  test('POST /posts returns 201 with body', async ({ apiClient }) => {
    // Create a new post — send userId, title, body (no id — server assigns it)
    const payload = { userId: 1, title: 'Sanity Post', body: 'Sanity body' };
    const response = await apiClient.post(ENDPOINTS.POSTS, payload);

    // POST success = 201 Created (NOT 200)
    expect(response.status()).toBe(HTTP_STATUS.CREATED);

    const created = (await response.json()) as Post;
    // Verify the server echoed back what we sent
    expect(created.title).toBe(payload.title);
    // Verify the server assigned an ID (a positive number)
    expect(typeof created.id).toBe('number');
  });

  // ── DELETE SANITY ──────────────────────────────────────────────────────────

  test('DELETE /posts/1 returns 200', async ({ apiClient }) => {
    // JSONPlaceholder returns 200 (not 204) on DELETE — this is unusual.
    // Most real APIs return 204 No Content for deletes. The regression suite
    // checks the body is an empty object {}.
    const response = await apiClient.delete(`${ENDPOINTS.POSTS}/1`);
    expect(response.status()).toBe(HTTP_STATUS.OK);
  });
});
