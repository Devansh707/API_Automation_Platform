// =============================================================================
// FILE: helpers/assertions.helper.ts
// PURPOSE: Reusable, named assertion methods to keep test files clean and readable.
//
// THE PROBLEM THIS SOLVES:
//   Without this, every test repeats the same verbose assertion:
//     expect(response.status(), `Expected 200 but got ${response.status()} for ${response.url()}`).toBe(200);
//
//   With ApiAssertions:
//     await ApiAssertions.assertOk(response);  ← clear intent, good error message
//
// WHY STATIC METHODS?
//   Static methods belong to the CLASS, not to an instance.
//   You call ApiAssertions.assertOk() without ever doing `new ApiAssertions()`.
//   This is the right choice for pure utility functions with no shared state.
//
// HOW TO USE:
//   import { ApiAssertions } from '../helpers/assertions.helper';
//   await ApiAssertions.assertOk(response);
//   await ApiAssertions.assertBodyContains<Post>(response, { title: 'Hello' });
// =============================================================================

import { APIResponse, expect } from '@playwright/test';
import { HTTP_STATUS } from '../config/constants';

export class ApiAssertions {

  // ---------------------------------------------------------------------------
  // assertStatus — the base assertion. All others call this one.
  //
  // The second argument to expect() is a custom failure message.
  // Without it, a failing test just says: "Expected 404, received 200"
  // With it:   "Expected HTTP 404 but got 200 for https://api.example.com/posts/1"
  // That tells you EXACTLY what went wrong without opening the reporter.
  // ---------------------------------------------------------------------------
  static async assertStatus(response: APIResponse, expectedStatus: number): Promise<void> {
    await Promise.resolve();
    expect(
      response.status(),
      `Expected HTTP ${expectedStatus} but got ${response.status()} for ${response.url()}`
    ).toBe(expectedStatus);
  }

  // Shortcut for asserting HTTP 200 OK
  static async assertOk(response: APIResponse): Promise<void> {
    await this.assertStatus(response, HTTP_STATUS.OK);
  }

  // Shortcut for asserting HTTP 201 Created (typical POST success)
  static async assertCreated(response: APIResponse): Promise<void> {
    await this.assertStatus(response, HTTP_STATUS.CREATED);
  }

  // Shortcut for asserting HTTP 404 Not Found
  static async assertNotFound(response: APIResponse): Promise<void> {
    await this.assertStatus(response, HTTP_STATUS.NOT_FOUND);
  }

  // ---------------------------------------------------------------------------
  // assertBodyContains<T> — verify specific fields in a JSON response body.
  //
  // GENERICS EXPLAINED:
  //   <T extends object> means T must be an object type (not a primitive).
  //   Partial<T> means "an object with some (not all) fields of T".
  //
  // Example usage:
  //   await ApiAssertions.assertBodyContains<Post>(response, {
  //     title: 'Hello World',   ← only check title and userId
  //     userId: 1,
  //     // id and body are NOT checked here
  //   });
  //
  // Returns the parsed body so the caller can do further assertions without
  // calling response.json() again (which would fail — body can only be read once
  // in some HTTP clients; Playwright buffers it but this is good practice).
  // ---------------------------------------------------------------------------
  static async assertBodyContains<T extends object>(
    response: APIResponse,
    expectedFields: Partial<T>
  ): Promise<T> {
    const body = (await response.json()) as T;

    // Loop over every key-value pair in expectedFields and assert each one.
    // Object.entries() converts { title: 'Hi', userId: 1 } to
    //   [ ['title', 'Hi'], ['userId', 1] ]
    for (const [key, value] of Object.entries(expectedFields)) {
      // Cast to Record<string, unknown> so TypeScript allows toHaveProperty
      // on a generic T (TypeScript loses the method types on generic objects).
      expect(body as Record<string, unknown>).toHaveProperty(key, value);
    }
    return body;
  }

  // ---------------------------------------------------------------------------
  // assertArrayNotEmpty — verify a list response has at least one item.
  // The custom message makes the failure self-explanatory in CI logs.
  // ---------------------------------------------------------------------------
  static assertArrayNotEmpty(array: unknown[]): void {
    expect(array.length, 'Expected non-empty array').toBeGreaterThan(0);
  }

  // ---------------------------------------------------------------------------
  // assertPaginatedResponse — for list endpoints with a maximum item count.
  // Checks: length > 0 AND length <= maxExpected
  // Use this when you know the dataset size (e.g. 100 posts max).
  // ---------------------------------------------------------------------------
  static assertPaginatedResponse(array: unknown[], maxExpected: number): void {
    expect(array.length).toBeGreaterThan(0);
    expect(array.length).toBeLessThanOrEqual(maxExpected);
  }

  // ---------------------------------------------------------------------------
  // assertValidId — verify an ID field is a positive integer.
  // API IDs should never be 0, negative, or a non-number type.
  // ---------------------------------------------------------------------------
  static assertValidId(id: unknown): void {
    expect(typeof id).toBe('number');
    expect(id as number).toBeGreaterThan(0);
  }

  // ---------------------------------------------------------------------------
  // assertValidEmail — verify an email field matches a basic email pattern.
  // Regex breakdown: [^\s@]+  = one or more chars that aren't space or @
  //                  @        = literal @
  //                  [^\s@]+  = domain name
  //                  \.       = literal dot
  //                  [^\s@]+  = TLD (.com, .org, etc.)
  // ---------------------------------------------------------------------------
  static assertValidEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(email).toMatch(emailRegex);
  }
}
