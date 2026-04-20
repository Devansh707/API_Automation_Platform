// =============================================================================
// FILE: helpers/api.client.ts
// PURPOSE: A wrapper around Playwright's APIRequestContext that adds logging
//          and provides a clean, consistent interface for making HTTP requests.
//
// THE PROBLEM THIS SOLVES:
//   Without this wrapper, every test file would repeat the same boilerplate:
//     const response = await request.get('/posts', { headers: {...}, params: {...} });
//     console.log(`GET /posts → ${response.status()}`);
//
//   With ApiClient, tests just call:
//     const response = await apiClient.get(ENDPOINTS.POSTS);
//   ...and logging, headers, and response handling are handled automatically.
//
// WHAT IS APIRequestContext?
//   It's Playwright's built-in HTTP client. It knows the baseURL (set in
//   playwright.config.ts) and adds default headers automatically.
//   Think of it as a pre-configured version of `fetch` or `axios`.
//
// HOW TO USE:
//   // ApiClient is injected by the fixture — you don't create it manually.
//   test('example', async ({ apiClient }) => {
//     const response = await apiClient.get('/posts/1');
//     const post = await apiClient.getJson<Post>('/posts/1'); // get + parse in one step
//   });
// =============================================================================

import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { logger } from './logger.helper';

// ---------------------------------------------------------------------------
// RequestOptions — optional extras you can pass to any request method.
// All fields are optional (?): you only include what you need.
// ---------------------------------------------------------------------------
export interface RequestOptions {
  headers?: Record<string, string>;                      // Extra HTTP headers
  params?:  Record<string, string | number | boolean>;  // URL query parameters (?key=val)
  data?:    unknown;                                     // Request body (unused here, kept for future)
  timeout?: number;                                      // Override the default timeout (ms)
}

// ---------------------------------------------------------------------------
// ApiClient class — one instance per test (created by the fixture).
// ---------------------------------------------------------------------------
export class ApiClient {

  // The constructor receives Playwright's request context.
  // `private readonly` means:
  //   private   → only this class can access it
  //   readonly  → it cannot be reassigned after construction
  constructor(private readonly request: APIRequestContext) {}

  // ---------------------------------------------------------------------------
  // GET — retrieve a resource (does not change server state)
  //
  // @param endpoint  Path appended to baseURL, e.g. '/posts/1'
  // @param options   Optional query params, headers, timeout
  // @returns         Raw Playwright APIResponse (check status, read body yourself)
  //
  // Example:
  //   const res = await apiClient.get('/posts', { params: { userId: 1 } });
  //   // URL sent: GET https://jsonplaceholder.typicode.com/posts?userId=1
  // ---------------------------------------------------------------------------
  async get(endpoint: string, options: RequestOptions = {}): Promise<APIResponse> {
    logger.info(`GET ${endpoint}`);
    const response = await this.request.get(endpoint, {
      headers: options.headers,
      // Playwright's `params` accepts Record<string, string> — we cast here
      // because our type is more permissive (allows numbers and booleans too)
      params: options.params as Record<string, string>,
      timeout: options.timeout,
    });
    logger.debug(`Response: ${response.status()} ${response.url()}`);
    return response;
  }

  // ---------------------------------------------------------------------------
  // POST — create a new resource
  //
  // @param payload   The request body (object, will be JSON-serialised)
  //
  // Example:
  //   const res = await apiClient.post('/posts', { userId: 1, title: 'Hi', body: '...' });
  //   expect(res.status()).toBe(201); // Created
  // ---------------------------------------------------------------------------
  async post(endpoint: string, payload: unknown, options: RequestOptions = {}): Promise<APIResponse> {
    logger.info(`POST ${endpoint}`, payload); // Logs the payload for debugging
    const response = await this.request.post(endpoint, {
      data: payload, // Playwright auto-serialises objects to JSON
      headers: options.headers,
      timeout: options.timeout,
    });
    logger.debug(`Response: ${response.status()}`);
    return response;
  }

  // ---------------------------------------------------------------------------
  // PUT — fully replace an existing resource (send the entire updated object)
  //
  // Difference from PATCH:
  //   PUT   → replace everything (omitted fields become null/default)
  //   PATCH → only update the fields you send
  // ---------------------------------------------------------------------------
  async put(endpoint: string, payload: unknown, options: RequestOptions = {}): Promise<APIResponse> {
    logger.info(`PUT ${endpoint}`, payload);
    const response = await this.request.put(endpoint, {
      data: payload,
      headers: options.headers,
      timeout: options.timeout,
    });
    logger.debug(`Response: ${response.status()}`);
    return response;
  }

  // ---------------------------------------------------------------------------
  // PATCH — partially update a resource (only send the fields you want to change)
  // ---------------------------------------------------------------------------
  async patch(endpoint: string, payload: unknown, options: RequestOptions = {}): Promise<APIResponse> {
    logger.info(`PATCH ${endpoint}`, payload);
    const response = await this.request.patch(endpoint, {
      data: payload,
      headers: options.headers,
      timeout: options.timeout,
    });
    logger.debug(`Response: ${response.status()}`);
    return response;
  }

  // ---------------------------------------------------------------------------
  // DELETE — remove a resource
  // No body is sent on DELETE requests (just the URL).
  // ---------------------------------------------------------------------------
  async delete(endpoint: string, options: RequestOptions = {}): Promise<APIResponse> {
    logger.info(`DELETE ${endpoint}`);
    const response = await this.request.delete(endpoint, {
      headers: options.headers,
      timeout: options.timeout,
    });
    logger.debug(`Response: ${response.status()}`);
    return response;
  }

  // ---------------------------------------------------------------------------
  // getJson<T> — convenience method: GET + assert 200 + parse body in one call.
  //
  // The generic <T> tells TypeScript what type the parsed JSON should be.
  // This eliminates repetitive boilerplate in tests:
  //
  //   BEFORE (3 lines):
  //     const response = await apiClient.get('/posts/1');
  //     expect(response.status()).toBe(200);
  //     const post = await response.json() as Post;
  //
  //   AFTER (1 line):
  //     const post = await apiClient.getJson<Post>('/posts/1');
  //
  // Only use this when you EXPECT a 200. For testing 404 or error responses,
  // use the plain `get()` method so you can inspect the status yourself.
  // ---------------------------------------------------------------------------
  async getJson<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.get(endpoint, options);
    // Built-in assertion — this will FAIL the test if the status is not 200
    expect(response.status()).toBe(200);
    // response.json() returns Promise<unknown>; we cast to T trusting the API
    return response.json() as Promise<T>;
  }
}
