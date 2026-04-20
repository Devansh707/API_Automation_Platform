import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS, LIMITS } from '../../config/constants';
import { ApiAssertions } from '../../helpers/assertions.helper';
import { Comment } from '../../types/api.types';

test.describe('GET Comments', () => {
  test('should fetch all comments', async ({ apiClient }) => {
    const response = await apiClient.get(ENDPOINTS.COMMENTS);
    expect(response.status()).toBe(HTTP_STATUS.OK);
    const comments = (await response.json()) as Comment[];
    expect(comments).toHaveLength(LIMITS.MAX_COMMENTS);
  });

  test('should fetch comments for a specific post', async ({ apiClient }) => {
    const postId = 1;
    const response = await apiClient.get(ENDPOINTS.COMMENTS, { params: { postId } });
    expect(response.status()).toBe(HTTP_STATUS.OK);
    const comments = (await response.json()) as Comment[];
    ApiAssertions.assertArrayNotEmpty(comments);
    comments.forEach((comment) => {
      expect(comment.postId).toBe(postId);
      ApiAssertions.assertValidEmail(comment.email);
    });
  });

  test('should fetch comments via post nested route', async ({ apiClient }) => {
    const response = await apiClient.get(`${ENDPOINTS.POSTS}/1/comments`);
    expect(response.status()).toBe(HTTP_STATUS.OK);
    const comments = (await response.json()) as Comment[];
    ApiAssertions.assertArrayNotEmpty(comments);
  });

  test('should have valid comment schema', async ({ apiClient }) => {
    const comment = await apiClient.getJson<Comment>(`${ENDPOINTS.COMMENTS}/1`);
    expect(comment).toMatchObject({
      id: expect.any(Number),
      postId: expect.any(Number),
      name: expect.any(String),
      email: expect.any(String),
      body: expect.any(String),
    });
  });

  test('should return 404 for non-existent comment', async ({ apiClient }) => {
    const response = await apiClient.get(`${ENDPOINTS.COMMENTS}/99999`);
    expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND);
  });
});
