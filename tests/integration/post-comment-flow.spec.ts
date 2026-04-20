// =============================================================================
// FILE: tests/integration/post-comment-flow.spec.ts
// SUITE: Integration Tests — Post → Comment relationship
//
// WHAT ARE INTEGRATION TESTS?
//   Unit tests test one thing in isolation.
//   Integration tests test how MULTIPLE things work together.
//
//   In API testing, integration tests verify DATA RELATIONSHIPS between endpoints:
//   "If I get post #1 and then get comments for post #1, do the comments
//    actually belong to post #1?"
//
// THIS FILE TESTS:
//   The relationship between /posts and /comments endpoints.
//   A Comment has a `postId` field that must match the Post's `id` field.
//   We verify this link is correct using two access patterns:
//     1. GET /comments?postId=1      ← query parameter filter
//     2. GET /posts/1/comments       ← nested/hierarchical route
//
// WHY TEST BOTH PATTERNS?
//   Both should return the same data. If they don't, there's a routing bug.
//   Testing both also shows you the two ways APIs expose related resources.
// =============================================================================

import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS } from '../../config/constants';
import { Post, Comment } from '../../types/api.types';

test.describe('Integration: Post → Comment Flow', () => {

  test('comments fetched by postId match the post', async ({ apiClient }) => {
    const postId = 1;

    // Step 1: Get the post to confirm it exists and note its id
    const postResponse = await apiClient.get(`${ENDPOINTS.POSTS}/${postId}`);
    expect(postResponse.status()).toBe(HTTP_STATUS.OK);
    const post = (await postResponse.json()) as Post;
    expect(post.id).toBe(postId);

    // Step 2: Fetch comments filtered by the post's id
    // `params: { postId }` appends ?postId=1 to the URL
    const commentsResponse = await apiClient.get(ENDPOINTS.COMMENTS, {
      params: { postId },
    });
    expect(commentsResponse.status()).toBe(HTTP_STATUS.OK);
    const comments = (await commentsResponse.json()) as Comment[];

    // Step 3: Verify the data relationship
    // Every returned comment must have postId === post.id
    // If even one doesn't match, the API has a filtering bug
    expect(comments.length).toBeGreaterThan(0);
    comments.forEach((comment) => {
      expect(comment.postId).toBe(post.id);
    });
  });

  test('nested route /posts/:id/comments returns same comments as query param', async ({ apiClient }) => {
    const postId = 2;

    // Test both access patterns in PARALLEL using Promise.all.
    // Promise.all waits for ALL promises to resolve, then returns their results
    // as an array in the same order. This halves the wait time vs sequential calls.
    const [nestedResponse, queryResponse] = await Promise.all([
      apiClient.get(`${ENDPOINTS.POSTS}/${postId}/comments`), // /posts/2/comments
      apiClient.get(ENDPOINTS.COMMENTS, { params: { postId } }), // /comments?postId=2
    ]);

    expect(nestedResponse.status()).toBe(HTTP_STATUS.OK);
    expect(queryResponse.status()).toBe(HTTP_STATUS.OK);

    const nestedComments  = (await nestedResponse.json())  as Comment[];
    const queryComments   = (await queryResponse.json())   as Comment[];

    // Both routes should return the same count of comments
    expect(nestedComments.length).toBe(queryComments.length);

    // And the same comment IDs (in the same order)
    nestedComments.forEach((comment, idx) => {
      expect(comment.id).toBe(queryComments[idx].id);
    });
  });

  test('all comments for a post have valid email addresses', async ({ apiClient }) => {
    const postId = 3;

    const response = await apiClient.get(`${ENDPOINTS.POSTS}/${postId}/comments`);
    expect(response.status()).toBe(HTTP_STATUS.OK);
    const comments = (await response.json()) as Comment[];

    // Cross-field validation: the email on each comment must look like a real email.
    // This catches data quality issues — e.g. if a migration corrupted the email field.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    comments.forEach((comment) => {
      expect(comment.email).toMatch(emailRegex);
    });
  });
});
