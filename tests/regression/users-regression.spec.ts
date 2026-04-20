import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS, LIMITS } from '../../config/constants';
import { ApiAssertions } from '../../helpers/assertions.helper';
import { User, Album } from '../../types/api.types';

test.describe('Regression: Users Full Coverage', () => {
  test('lists all 10 users', async ({ apiClient }) => {
    const users = await apiClient.getJson<User[]>(ENDPOINTS.USERS);
    expect(users).toHaveLength(LIMITS.MAX_USERS);
  });

  test('each user has a valid unique email', async ({ apiClient }) => {
    const users = await apiClient.getJson<User[]>(ENDPOINTS.USERS);
    const emails = users.map((u) => u.email);
    const uniqueEmails = new Set(emails);
    expect(uniqueEmails.size).toBe(users.length);
    users.forEach((user) => ApiAssertions.assertValidEmail(user.email));
  });

  test('user schema contains all required nested fields', async ({ apiClient }) => {
    const user = await apiClient.getJson<User>(`${ENDPOINTS.USERS}/1`);
    expect(user).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      username: expect.any(String),
      email: expect.any(String),
      phone: expect.any(String),
      website: expect.any(String),
      address: expect.objectContaining({
        street: expect.any(String),
        suite: expect.any(String),
        city: expect.any(String),
        zipcode: expect.any(String),
        geo: expect.objectContaining({
          lat: expect.any(String),
          lng: expect.any(String),
        }),
      }),
      company: expect.objectContaining({
        name: expect.any(String),
        catchPhrase: expect.any(String),
        bs: expect.any(String),
      }),
    });
  });

  test('returns 404 for non-existent user', async ({ apiClient }) => {
    const response = await apiClient.get(`${ENDPOINTS.USERS}/99999`);
    expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND);
  });

  test('all 10 users have IDs from 1 to 10', async ({ apiClient }) => {
    const users = await apiClient.getJson<User[]>(ENDPOINTS.USERS);
    const ids = users.map((u) => u.id).sort((a, b) => a - b);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test('nested /users/:id/albums returns albums for that user only', async ({ apiClient }) => {
    const userId = 1;
    const albums = await apiClient.getJson<Album[]>(`${ENDPOINTS.USERS}/${userId}/albums`);
    ApiAssertions.assertArrayNotEmpty(albums);
    albums.forEach((album) => {
      expect(album.userId).toBe(userId);
      expect(album).toHaveProperty('id');
      expect(typeof album.title).toBe('string');
    });
  });

  test('multiple users each have albums', async ({ apiClient }) => {
    const userIds = [1, 2, 3];
    const responses = await Promise.all(
      userIds.map((id) => apiClient.getJson<Album[]>(`${ENDPOINTS.USERS}/${id}/albums`))
    );
    responses.forEach((albums, idx) => {
      expect(albums.length).toBeGreaterThan(0);
      albums.forEach((album) => expect(album.userId).toBe(userIds[idx]));
    });
  });
});
