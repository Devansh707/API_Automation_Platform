import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS, LIMITS } from '../../config/constants';
import { ApiAssertions } from '../../helpers/assertions.helper';
import { User } from '../../types/api.types';

test.describe('GET Users', () => {
  test('should fetch all users', async ({ apiClient }) => {
    const users = await apiClient.getJson<User[]>(ENDPOINTS.USERS);
    expect(users).toHaveLength(LIMITS.MAX_USERS);
  });

  test('should fetch user by ID with full schema', async ({ apiClient }) => {
    const user = await apiClient.getJson<User>(`${ENDPOINTS.USERS}/1`);
    expect(user).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      username: expect.any(String),
      email: expect.any(String),
      address: expect.objectContaining({
        city: expect.any(String),
        zipcode: expect.any(String),
      }),
      company: expect.objectContaining({
        name: expect.any(String),
      }),
    });
    ApiAssertions.assertValidEmail(user.email);
  });

  test('should return 404 for non-existent user', async ({ apiClient }) => {
    const response = await apiClient.get(`${ENDPOINTS.USERS}/99999`);
    expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND);
  });

  test('all users should have valid email addresses', async ({ apiClient }) => {
    const users = await apiClient.getJson<User[]>(ENDPOINTS.USERS);
    users.forEach((user) => ApiAssertions.assertValidEmail(user.email));
  });

  test('all user IDs should be unique', async ({ apiClient }) => {
    const users = await apiClient.getJson<User[]>(ENDPOINTS.USERS);
    const ids = new Set(users.map((u) => u.id));
    expect(ids.size).toBe(users.length);
  });
});
