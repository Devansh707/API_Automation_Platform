import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS, LIMITS } from '../../config/constants';
import { ApiAssertions } from '../../helpers/assertions.helper';
import { Comment } from '../../types/api.types';

test.describe('Regression: Comments Full Coverage', () => {
  test('lists all 500 comments', async ({ apiClient }) => {
    const comments = await apiClient.getJson<Comment[]>(ENDPOINTS.COMMENTS);
    expect(comments).toHaveLength(LIMITS.MAX_COMMENTS);
  });

  test('comment schema has all required fields', async ({ apiClient }) => {
    const comment = await apiClient.getJson<Comment>(`${ENDPOINTS.COMMENTS}/1`);
    expect(comment).toMatchObject({
      id: expect.any(Number),
      postId: expect.any(Number),
      name: expect.any(String),
      email: expect.any(String),
      body: expect.any(String),
    });
    ApiAssertions.assertValidEmail(comment.email);
  });

  test('all comments have valid email addresses', async ({ apiClient }) => {
    const comments = await apiClient.getJson<Comment[]>(ENDPOINTS.COMMENTS);
    comments.forEach((comment) => ApiAssertions.assertValidEmail(comment.email));
  });

  test('filter comments by postId returns only matching comments', async ({ apiClient }) => {
    const postId = 5;
    const response = await apiClient.get(ENDPOINTS.COMMENTS, { params: { postId } });
    expect(response.status()).toBe(HTTP_STATUS.OK);
    const comments = (await response.json()) as Comment[];
    ApiAssertions.assertArrayNotEmpty(comments);
    comments.forEach((comment) => expect(comment.postId).toBe(postId));
  });

  test('nested /posts/:id/comments returns correct comments', async ({ apiClient }) => {
    const postId = 1;
    const response = await apiClient.get(`${ENDPOINTS.POSTS}/${postId}/comments`);
    expect(response.status()).toBe(HTTP_STATUS.OK);
    const comments = (await response.json()) as Comment[];
    ApiAssertions.assertArrayNotEmpty(comments);
    comments.forEach((comment) => expect(comment.postId).toBe(postId));
  });

  test('GET /comments/:id returns 404 for non-existent comment', async ({ apiClient }) => {
    const response = await apiClient.get(`${ENDPOINTS.COMMENTS}/99999`);
    expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND);
  });

  test('each post has exactly 5 comments', async ({ apiClient }) => {
    const postId = 1;
    const response = await apiClient.get(`${ENDPOINTS.POSTS}/${postId}/comments`);
    const comments = (await response.json()) as Comment[];
    expect(comments).toHaveLength(5);
  });

  test('comment IDs are unique across all comments', async ({ apiClient }) => {
    const comments = await apiClient.getJson<Comment[]>(ENDPOINTS.COMMENTS);
    const ids = comments.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(comments.length);
  });
});
