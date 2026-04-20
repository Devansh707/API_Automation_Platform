// =============================================================================
// FILE: config/constants.ts
// PURPOSE: Central store for all "magic values" used across the framework.
//
// WHY THIS FILE EXISTS:
//   If you write "/posts" directly in 20 test files and the API changes the
//   path to "/blog-posts", you'd have to edit 20 files.
//   Put it here once → change it once.
//
// HOW TO USE:
//   import { ENDPOINTS, HTTP_STATUS, LIMITS } from '../config/constants';
//   const response = await apiClient.get(ENDPOINTS.POSTS);
//   expect(response.status()).toBe(HTTP_STATUS.OK);
// =============================================================================

// ---------------------------------------------------------------------------
// ENDPOINTS
// All API paths relative to baseURL (set in playwright.config.ts).
// "as const" makes every value a readonly string literal (e.g. '/posts')
// instead of a generic string — TypeScript will warn if you mistype a path.
// ---------------------------------------------------------------------------
export const ENDPOINTS = {
  POSTS:    '/posts',    // Blog posts resource
  USERS:    '/users',    // User accounts resource
  COMMENTS: '/comments', // Post comments resource
  ALBUMS:   '/albums',   // Photo albums resource
  TODOS:    '/todos',    // Todo items resource
  PHOTOS:   '/photos',   // Photos resource
} as const;

// ---------------------------------------------------------------------------
// HTTP_STATUS
// Standard HTTP response codes.
// Using named constants instead of raw numbers makes tests self-documenting:
//   expect(response.status()).toBe(HTTP_STATUS.CREATED)   ← clear meaning
//   expect(response.status()).toBe(201)                   ← what does 201 mean?
// ---------------------------------------------------------------------------
export const HTTP_STATUS = {
  OK:           200, // Request succeeded, body contains the result
  CREATED:      201, // Resource was successfully created (POST response)
  NO_CONTENT:   204, // Success but no body (common for DELETE)
  BAD_REQUEST:  400, // Client sent malformed data
  UNAUTHORIZED: 401, // Missing or invalid authentication
  FORBIDDEN:    403, // Authenticated but not allowed
  NOT_FOUND:    404, // Resource does not exist
  UNPROCESSABLE:422, // Validation failed (correct format, wrong data)
  SERVER_ERROR: 500, // Something broke on the server side
} as const;

// ---------------------------------------------------------------------------
// LIMITS
// Known data counts for JSONPlaceholder.
// Used in tests like: expect(posts).toHaveLength(LIMITS.MAX_POSTS)
// If you switch to a real API, update these numbers here once.
// ---------------------------------------------------------------------------
export const LIMITS = {
  MAX_POSTS:    100, // Total posts in the dataset
  MAX_USERS:    10,  // Total users in the dataset
  MAX_COMMENTS: 500, // Total comments in the dataset
  MAX_ALBUMS:   100, // Total albums in the dataset
  PAGE_SIZE:    10,  // Default page size (if pagination is added)
} as const;
