import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS, LIMITS } from '../../config/constants';
import { ApiAssertions } from '../../helpers/assertions.helper';
import { Post, CreatePostPayload } from '../../types/api.types';

test.describe('Regression: Posts Full Coverage', () => {
  test.describe('GET', () => {
    test('lists all 100 posts', async ({ apiClient }) => {
      const posts = await apiClient.getJson<Post[]>(ENDPOINTS.POSTS);
      expect(posts).toHaveLength(LIMITS.MAX_POSTS);
    });

    test('fetches post by ID with correct schema', async ({ apiClient }) => {
      const post = await apiClient.getJson<Post>(`${ENDPOINTS.POSTS}/1`);
      expect(post).toMatchObject({
        id: expect.any(Number),
        userId: expect.any(Number),
        title: expect.any(String),
        body: expect.any(String),
      });
      ApiAssertions.assertValidId(post.id);
    });

    test('returns 404 for non-existent post ID', async ({ apiClient }) => {
      const response = await apiClient.get(`${ENDPOINTS.POSTS}/99999`);
      await ApiAssertions.assertNotFound(response);
    });

    test('filters posts by userId', async ({ apiClient }) => {
      const userId = 2;
      const posts = await apiClient.getJson<Post[]>(ENDPOINTS.POSTS, {
        params: { userId },
      });
      ApiAssertions.assertArrayNotEmpty(posts);
      posts.forEach((post) => expect(post.userId).toBe(userId));
    });

    test('returns empty array for userId that has no posts', async ({ apiClient }) => {
      const response = await apiClient.get(ENDPOINTS.POSTS, {
        params: { userId: 9999 },
      });
      await ApiAssertions.assertOk(response);
      const posts = (await response.json()) as Post[];
      expect(posts).toHaveLength(0);
    });
  });

  test.describe('POST', () => {
    test('creates post and returns 201 with generated ID', async ({ apiClient }) => {
      const payload: CreatePostPayload = { userId: 1, title: 'Regression Post', body: 'body' };
      const response = await apiClient.post(ENDPOINTS.POSTS, payload);
      await ApiAssertions.assertCreated(response);
      const created = (await response.json()) as Post;
      ApiAssertions.assertValidId(created.id);
      expect(created.title).toBe(payload.title);
    });

    test('echoes all payload fields in response', async ({ apiClient }) => {
      const payload: CreatePostPayload = { userId: 5, title: 'Echo Test', body: 'Echo body' };
      const response = await apiClient.post(ENDPOINTS.POSTS, payload);
      await ApiAssertions.assertBodyContains<Post>(response, {
        userId: payload.userId,
        title: payload.title,
        body: payload.body,
      });
    });
  });

  test.describe('PUT', () => {
    test('fully replaces post and returns updated resource', async ({ apiClient }) => {
      const payload: Post = { id: 1, userId: 1, title: 'PUT Replaced', body: 'PUT body' };
      const response = await apiClient.put(`${ENDPOINTS.POSTS}/1`, payload);
      await ApiAssertions.assertOk(response);
      const updated = (await response.json()) as Post;
      expect(updated.title).toBe(payload.title);
      expect(updated.body).toBe(payload.body);
    });

    test('PUT to non-existent post returns 404', async ({ apiClient }) => {
      const response = await apiClient.put(`${ENDPOINTS.POSTS}/99999`, {
        id: 99999,
        userId: 1,
        title: 'Ghost',
        body: 'body',
      });
      await ApiAssertions.assertNotFound(response);
    });
  });

  test.describe('PATCH', () => {
    test('partially updates only title field', async ({ apiClient }) => {
      const response = await apiClient.patch(`${ENDPOINTS.POSTS}/1`, { title: 'Patched Title' });
      await ApiAssertions.assertOk(response);
      const updated = (await response.json()) as Post;
      expect(updated.title).toBe('Patched Title');
      expect(updated.id).toBe(1);
    });

    test('partially updates only body field', async ({ apiClient }) => {
      const response = await apiClient.patch(`${ENDPOINTS.POSTS}/2`, { body: 'Patched body only' });
      await ApiAssertions.assertOk(response);
      const updated = (await response.json()) as Post;
      expect(updated.body).toBe('Patched body only');
    });
  });

  test.describe('DELETE', () => {
    test('deletes a post and returns 200', async ({ apiClient }) => {
      const response = await apiClient.delete(`${ENDPOINTS.POSTS}/1`);
      expect(response.status()).toBe(HTTP_STATUS.OK);
    });

    test('delete response body is empty object', async ({ apiClient }) => {
      const response = await apiClient.delete(`${ENDPOINTS.POSTS}/2`);
      expect(response.status()).toBe(HTTP_STATUS.OK);
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toEqual({});
    });

    test('DELETE non-existent post returns 404', async ({ apiClient }) => {
      const response = await apiClient.delete(`${ENDPOINTS.POSTS}/99999`);
      await ApiAssertions.assertNotFound(response);
    });
  });
});
