import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS } from '../../config/constants';
import { ApiAssertions } from '../../helpers/assertions.helper';
import { Album } from '../../types/api.types';

test.describe('GET User Albums', () => {
  test('should fetch albums for a specific user', async ({ apiClient }) => {
    const userId = 1;
    const response = await apiClient.get(`${ENDPOINTS.USERS}/${userId}/albums`);
    expect(response.status()).toBe(HTTP_STATUS.OK);
    const albums = (await response.json()) as Album[];
    ApiAssertions.assertArrayNotEmpty(albums);
    albums.forEach((album) => {
      expect(album.userId).toBe(userId);
      expect(album).toHaveProperty('id');
      expect(album).toHaveProperty('title');
    });
  });

  test('should return all albums with correct schema', async ({ apiClient }) => {
    const albums = await apiClient.getJson<Album[]>(ENDPOINTS.ALBUMS);
    ApiAssertions.assertArrayNotEmpty(albums);
    expect(albums[0]).toMatchObject({
      id: expect.any(Number),
      userId: expect.any(Number),
      title: expect.any(String),
    });
  });

  test('albums from different users have different userIds', async ({ apiClient }) => {
    const [albums1, albums2] = await Promise.all([
      apiClient.getJson<Album[]>(`${ENDPOINTS.USERS}/1/albums`),
      apiClient.getJson<Album[]>(`${ENDPOINTS.USERS}/2/albums`),
    ]);
    albums1.forEach((a) => expect(a.userId).toBe(1));
    albums2.forEach((a) => expect(a.userId).toBe(2));
  });
});
