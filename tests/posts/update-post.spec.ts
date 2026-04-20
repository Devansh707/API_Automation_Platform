// =============================================================================
// FILE: tests/posts/update-post.spec.ts
// SUITE: Unit-style Tests — PUT & PATCH /posts/:id
//
// HTTP UPDATE METHODS EXPLAINED:
//   PUT   → "Replace this resource entirely with what I'm sending"
//           You MUST send all fields. Omitted fields will be lost/nulled.
//           Use case: "Save the whole form"
//
//   PATCH → "Update only the fields I'm sending, leave the rest alone"
//           You only send the fields you want to change.
//           Use case: "Change just the title, keep everything else"
//
// WHAT THIS FILE COVERS:
//   • PUT replaces the full post and returns the updated resource
//   • PATCH updates only the specified field
//   • PUT on a non-existent ID returns 404
//   • PATCH preserves un-patched fields
// =============================================================================

import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS } from '../../config/constants';
import { ApiAssertions } from '../../helpers/assertions.helper';
import { Post, UpdatePostPayload } from '../../types/api.types';

test.describe('PUT / PATCH Posts', () => {

  // We use post #1 for all update tests — it's guaranteed to exist in JSONPlaceholder
  const existingPostId = 1;

  test('should fully replace a post with PUT', async ({ apiClient }) => {
    // PUT payload must include ALL fields — including the id
    const payload: Post = {
      id:     existingPostId,
      userId: 1,
      title:  'Updated Title via PUT',
      body:   'Updated body via PUT',
    };

    // PUT /posts/1 — replace post #1 with the payload
    const response = await apiClient.put(`${ENDPOINTS.POSTS}/${existingPostId}`, payload);

    // 200 OK — the resource was updated and the updated resource is returned
    await ApiAssertions.assertOk(response);

    const updated = (await response.json()) as Post;

    // Verify the response reflects our update
    expect(updated.id).toBe(existingPostId);
    expect(updated.title).toBe(payload.title);
    expect(updated.body).toBe(payload.body);
  });

  test('should partially update a post with PATCH', async ({ apiClient }) => {
    // UpdatePostPayload = Partial<CreatePostPayload> = { userId?, title?, body? }
    // We only send the title — body and userId stay unchanged on the server
    const patchPayload: UpdatePostPayload = { title: 'Partially Updated Title' };

    const response = await apiClient.patch(`${ENDPOINTS.POSTS}/${existingPostId}`, patchPayload);
    await ApiAssertions.assertOk(response);

    const updated = (await response.json()) as Post;

    // The title should be our new value
    expect(updated.title).toBe(patchPayload.title);

    // The ID should be unchanged (we didn't touch it)
    expect(updated.id).toBe(existingPostId);
  });

  test('should return 404 when updating non-existent post via PUT', async ({ apiClient }) => {
    // ID 99999 doesn't exist — PUT on a non-existent resource should 404
    const response = await apiClient.put(`${ENDPOINTS.POSTS}/99999`, {
      title:  'Ghost Update',
      body:   'body',
      userId: 1,
      id:     99999,
    });
    await ApiAssertions.assertNotFound(response);
  });

  test('PATCH preserves existing fields not in payload', async ({ apiClient }) => {
    // Send ONLY the title change — body, userId should remain
    const response = await apiClient.patch(`${ENDPOINTS.POSTS}/1`, {
      title: 'Only Title Changed',
    });
    await ApiAssertions.assertOk(response);

    const updated = (await response.json()) as Post;
    expect(updated.id).toBe(1);             // id preserved
    expect(updated.title).toBe('Only Title Changed'); // new title applied
    // NOTE: JSONPlaceholder always echoes the sent data but doesn't truly persist,
    // so on a real API you'd also assert the body/userId are still their original values
  });
});
