# API Automation Framework — Complete Tutorial

This guide explains the entire codebase from scratch. No prior Playwright or TypeScript
experience assumed. Read it top to bottom on your first pass, then use it as a reference.

---

## Table of Contents

1. [What This Project Does](#1-what-this-project-does)
2. [How the Pieces Fit Together](#2-how-the-pieces-fit-together)
3. [Project Structure Explained](#3-project-structure-explained)
4. [Layer 1 — Config](#4-layer-1--config)
5. [Layer 2 — Types](#5-layer-2--types)
6. [Layer 3 — Helpers](#6-layer-3--helpers)
7. [Layer 4 — Fixtures](#7-layer-4--fixtures)
8. [Layer 5 — Tests](#8-layer-5--tests)
9. [The Playwright Config File](#9-the-playwright-config-file)
10. [Environment Files (.env)](#10-environment-files-env)
11. [Docker — Containerised Runs](#11-docker--containerised-runs)
12. [Jenkins — CI/CD Pipeline](#12-jenkins--cicd-pipeline)
13. [Running Tests Step by Step](#13-running-tests-step-by-step)
14. [Reading Test Output](#14-reading-test-output)
15. [How to Add a New Test](#15-how-to-add-a-new-test)
16. [Common Errors and Fixes](#16-common-errors-and-fixes)

---

## 1. What This Project Does

This is an **API automation framework** — a collection of code that automatically
tests a REST API by making HTTP requests and verifying the responses.

**What API we test:**
[JSONPlaceholder](https://jsonplaceholder.typicode.com) — a free, public fake REST API
with posts, users, comments, albums, todos, and photos. It's perfect for learning
because it's always available and requires no authentication.

**Example of what one test does:**
```
1. Send:  GET https://jsonplaceholder.typicode.com/posts/1
2. Check: HTTP status is 200
3. Check: Response body has id, userId, title, body fields
4. Check: id === 1
```

**Tools used:**
| Tool | What it does |
|------|-------------|
| **Playwright** | Makes HTTP requests and provides the test runner |
| **TypeScript** | Adds types to JavaScript so mistakes are caught before running |
| **dotenv** | Loads configuration from .env files |
| **ESLint** | Finds code style problems |
| **Docker** | Packages the tests into a container that runs anywhere |
| **Jenkins** | Runs the tests automatically on every code push |

---

## 2. How the Pieces Fit Together

```
┌──────────────────────────────────────────────────────────────────────┐
│                         TEST FILE                                     │
│  tests/posts/get-posts.spec.ts                                        │
│                                                                        │
│  test('fetch all posts', async ({ apiClient }) => {                   │
│    const response = await apiClient.get(ENDPOINTS.POSTS); ──┐         │
│    expect(response.status()).toBe(HTTP_STATUS.OK);           │         │
│  });                                                          │         │
└───────────────────────────────────────────────────────────── │ ───────┘
                                                               │
         ┌─────────────────────────────────────────────────────┘
         │   `apiClient` is injected by the FIXTURE
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FIXTURE                                      │
│  fixtures/api.fixture.ts                                             │
│                                                                       │
│  Creates an ApiClient wrapping Playwright's request context.         │
│  Passes it to the test, then cleans up after.                        │
└────────────────────────────────────────────────────────┬────────────┘
                                                         │
                                                         │  uses
                                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     HELPERS                                          │
│                                                                       │
│  helpers/api.client.ts        ← wraps HTTP methods (get, post, ...)  │
│  helpers/assertions.helper.ts ← reusable expect() calls              │
│  helpers/logger.helper.ts     ← prints [INFO] GET /posts to console  │
└────────────────────────────────────────────────────────┬────────────┘
                                                         │
                                                         │  reads
                                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CONFIG + TYPES                                   │
│                                                                       │
│  config/constants.ts    ← ENDPOINTS, HTTP_STATUS, LIMITS             │
│  config/environments.ts ← baseUrl, timeout per environment           │
│  types/api.types.ts     ← Post, User, Comment interfaces             │
└─────────────────────────────────────────────────────────────────────┘
```

**Data flow for one test:**
```
Test calls apiClient.get('/posts')
    → ApiClient calls Playwright's request.get('/posts')
        → Playwright prepends baseURL from playwright.config.ts
            → HTTP GET https://jsonplaceholder.typicode.com/posts
                → Server responds: 200 [{id:1, title:'...', ...}, ...]
            → Playwright returns APIResponse object
        → ApiClient logs "Response: 200 ..." and returns the response
    → Test calls expect(response.status()).toBe(200)
        → PASS ✓
```

---

## 3. Project Structure Explained

```
E:\API_Automation_PlayW\
│
├── config/                   ← Environment settings and shared constants
│   ├── constants.ts          ← All API paths and status codes in one place
│   └── environments.ts       ← Per-environment URLs, timeouts, log levels
│
├── types/                    ← TypeScript interfaces (what API responses look like)
│   ├── api.types.ts          ← Post, User, Comment, Album, Todo interfaces
│   └── env.types.ts          ← Declares what .env variables exist
│
├── helpers/                  ← Reusable utilities (not tests themselves)
│   ├── logger.helper.ts      ← Level-aware console logger
│   ├── api.client.ts         ← HTTP client wrapper (get/post/put/patch/delete)
│   └── assertions.helper.ts  ← Named assertion methods
│
├── fixtures/                 ← Playwright test setup/teardown
│   ├── api.fixture.ts        ← Injects `apiClient` into every test
│   └── test-data.fixture.ts  ← Creates test data before test, deletes after
│
├── tests/                    ← All test files, organised by purpose
│   ├── smoke/                ← Is the server alive? (~5 sec)
│   ├── sanity/               ← Does basic CRUD work? (~15 sec)
│   ├── integration/          ← Do resources relate correctly? (~30 sec)
│   ├── regression/           ← Exhaustive edge cases (~60 sec)
│   ├── posts/                ← Per-endpoint tests for /posts
│   ├── users/                ← Per-endpoint tests for /users
│   └── comments/             ← Per-endpoint tests for /comments
│
├── playwright.config.ts      ← Master Playwright configuration
├── package.json              ← Dependencies and npm scripts
├── tsconfig.json             ← TypeScript compiler settings
├── .env                      ← Local environment variables (gitignored)
├── .env.example              ← Template showing what variables are needed
├── Dockerfile                ← Builds a container image for the test runner
├── docker-compose.yml        ← Defines services for running tests in Docker
└── Jenkinsfile               ← Defines the CI/CD pipeline stages
```

---

## 4. Layer 1 — Config

### `config/constants.ts`

Stores every "magic value" used across the framework.

```typescript
// Instead of writing '/posts' in 20 test files:
await apiClient.get('/posts')           // ← BAD: hard to change

// Write it once in constants.ts:
export const ENDPOINTS = { POSTS: '/posts' }

// Use it everywhere:
await apiClient.get(ENDPOINTS.POSTS)    // ← GOOD: change once, works everywhere
```

The `as const` suffix is a TypeScript feature that makes values readonly string
literals. This means TypeScript will catch typos: `ENDPOINTS.POTS` → compile error.

### `config/environments.ts`

Different environments (development, staging, CI) need different settings.

```
Development  → 30s timeout, 0 retries, debug logging (you're watching it)
Staging      → 45s timeout, 1 retry (staging can be slower)
CI (Jenkins) → 60s timeout, 2 retries (shared servers are unpredictable)
```

**How the environment is selected:**

```bash
# Terminal:
NODE_ENV=staging npm test    ← loads staging config
npm test                     ← defaults to 'development' config
```

**How dotenv loading works (two steps):**
```
Step 1: Load .env.staging   (has NODE_ENV=staging, maybe a different BASE_URL)
Step 2: Load .env           (fallback — only fills in missing variables)

Rule: Earlier loaded values WIN. dotenv never overwrites existing variables.
```

---

## 5. Layer 2 — Types

### `types/api.types.ts`

TypeScript interfaces that match the exact JSON structure returned by the API.

**Why this matters:**

```typescript
// WITHOUT types:
const response = await request.get('/posts/1');
const data = await response.json();   // data is `any` — no autocomplete, no checks
console.log(data.tittle);             // typo! no error, just returns undefined at runtime

// WITH types:
const post = await response.json() as Post;
console.log(post.tittle);             // TypeScript ERROR at compile time ← caught early
console.log(post.title);              // correct ← TypeScript confirms this field exists
```

**Utility types (derived types):**

```typescript
interface Post {
  id: number; userId: number; title: string; body: string;
}

// Omit removes 'id' — because when creating, the server assigns the ID
type CreatePostPayload = Omit<Post, 'id'>;
// Result: { userId: number; title: string; body: string }

// Partial makes all fields optional — for PATCH (update only what you send)
type UpdatePostPayload = Partial<CreatePostPayload>;
// Result: { userId?: number; title?: string; body?: string }
```

### `types/env.types.ts`

Extends Node.js's built-in `process.env` type so TypeScript knows about our
specific environment variables and their allowed values.

---

## 6. Layer 3 — Helpers

### `helpers/logger.helper.ts`

Controls what gets printed to the terminal during test runs.

**Log levels (lowest → highest):**
```
debug → info → warn → error
```

If the level is set to `info`, then `debug` messages are silenced.
This keeps CI output clean while keeping local development verbose.

**In test output, you'll see:**
```
[2024-01-15T10:23:45.123Z] [INFO]  GET /posts
[2024-01-15T10:23:45.456Z] [DEBUG] Response: 200 https://jsonplaceholder.typicode.com/posts
```

### `helpers/api.client.ts`

The HTTP client wrapper. All tests use this instead of Playwright's raw request context.

**What it provides:**

```typescript
apiClient.get(endpoint, options?)     // HTTP GET
apiClient.post(endpoint, payload, options?)   // HTTP POST with JSON body
apiClient.put(endpoint, payload, options?)    // HTTP PUT (full replace)
apiClient.patch(endpoint, payload, options?)  // HTTP PATCH (partial update)
apiClient.delete(endpoint, options?)  // HTTP DELETE
apiClient.getJson<T>(endpoint)        // GET + assert 200 + parse body in one call
```

**The `options` parameter:**
```typescript
// You can optionally pass:
{
  headers: { 'X-Custom-Header': 'value' },     // extra HTTP headers
  params:  { userId: 1, page: 2 },             // URL query params (?userId=1&page=2)
  timeout: 5000,                                // override timeout for this request
}
```

### `helpers/assertions.helper.ts`

Named assertion methods that wrap Playwright's `expect()`.

**Why not just write `expect(response.status()).toBe(200)` directly?**

With raw expect:
```
Expected: 200
Received: 404
```

With the helper:
```
Expected HTTP 200 but got 404 for https://jsonplaceholder.typicode.com/posts/99
```
The helper adds the URL to the error message — much easier to debug.

**Available methods:**

| Method | What it checks |
|--------|---------------|
| `assertStatus(response, code)` | Status equals `code` |
| `assertOk(response)` | Status is 200 |
| `assertCreated(response)` | Status is 201 |
| `assertNotFound(response)` | Status is 404 |
| `assertBodyContains<T>(response, fields)` | Body has specific field values |
| `assertArrayNotEmpty(array)` | Array has at least one item |
| `assertPaginatedResponse(array, max)` | Array has items, not more than `max` |
| `assertValidId(id)` | Value is a number > 0 |
| `assertValidEmail(email)` | String matches email format |

---

## 7. Layer 4 — Fixtures

### Understanding Fixtures

A **fixture** is a piece of test infrastructure that is set up before a test and
torn down after it. Playwright fixtures are injected into tests as function arguments.

```typescript
// You write this in your test:
test('my test', async ({ apiClient }) => {   // ← apiClient appears by magic
  const response = await apiClient.get('/posts');
});

// You do NOT write:
test('my test', async () => {
  const client = new ApiClient(request);     // ← you never manually do this
  const response = await client.get('/posts');
});
```

Playwright handles the entire lifecycle: create the fixture, inject it, destroy it.

### `fixtures/api.fixture.ts`

Provides `apiClient` to every test.

```
SETUP:    Creates ApiClient wrapping Playwright's request context
          ↓
TEST RUNS (apiClient is available as a parameter)
          ↓
TEARDOWN: Nothing (ApiClient is stateless — no connections to close)
```

### `fixtures/test-data.fixture.ts`

Provides `seedPost` — a post that is created BEFORE the test and deleted AFTER.

```
SETUP:    POST /posts → creates a post → stores the Post object
          ↓
TEST RUNS (seedPost contains the created post, e.g. { id: 101, title: '...', ... })
          ↓
TEARDOWN: DELETE /posts/101 → removes the post
```

**When to use `test-data.fixture.ts` vs `api.fixture.ts`:**

Use `api.fixture.ts` (just `apiClient`) for:
- GET tests (reading doesn't need pre-existing data)
- Tests where you create and delete within the test itself

Use `test-data.fixture.ts` (both `apiClient` and `seedPost`) for:
- Tests that need a resource to already exist (e.g. testing PUT /posts/:id)

---

## 8. Layer 5 — Tests

### Test Suites and Their Purpose

```
┌─────────────┬──────────────┬─────────────────────────────────────────────┐
│ Suite       │ Run time     │ What it checks                              │
├─────────────┼──────────────┼─────────────────────────────────────────────┤
│ Smoke       │ ~5 seconds   │ Is the server alive? HTTP 200 on main URLs  │
│ Sanity      │ ~15 seconds  │ Does basic CRUD work per resource?          │
│ Integration │ ~30 seconds  │ Do cross-resource relationships work?       │
│ Regression  │ ~60 seconds  │ All CRUD operations + every edge case       │
│ Unit-style  │ varies       │ Per-endpoint deep tests (posts/, users/, …) │
└─────────────┴──────────────┴─────────────────────────────────────────────┘
```

**The CI pipeline runs them in order.** If smoke fails, the rest are skipped —
no point running 60 seconds of tests against a down server.

### Anatomy of a Test File

```typescript
// 1. IMPORTS — what the test needs
import { test, expect } from '../../fixtures/api.fixture';
//       ↑ extended test   ↑ assertion function (re-exported from fixture)
import { ENDPOINTS, HTTP_STATUS } from '../../config/constants';
import { Post } from '../../types/api.types';

// 2. DESCRIBE BLOCK — groups related tests
test.describe('GET Posts', () => {

  // 3. TEST CASE — one scenario
  test('should fetch a single post by ID', async ({ apiClient }) => {
    //                                             ↑ injected by fixture

    // ARRANGE — set up inputs
    const postId = 1;

    // ACT — perform the action being tested
    const response = await apiClient.get(`${ENDPOINTS.POSTS}/${postId}`);

    // ASSERT — verify the outcome
    expect(response.status()).toBe(HTTP_STATUS.OK);
    const post = (await response.json()) as Post;
    expect(post.id).toBe(postId);
  });

});
```

### Common Test Patterns

**Pattern 1 — Basic GET and assert status:**
```typescript
const response = await apiClient.get(ENDPOINTS.POSTS);
expect(response.status()).toBe(HTTP_STATUS.OK);
```

**Pattern 2 — GET and parse body with types:**
```typescript
const post = await apiClient.getJson<Post>(`${ENDPOINTS.POSTS}/1`);
// getJson = GET + assert 200 + parse JSON, all in one line
expect(post.title).toBe('...');
```

**Pattern 3 — POST and assert creation:**
```typescript
const response = await apiClient.post(ENDPOINTS.POSTS, { userId: 1, title: 'Hi', body: '...' });
expect(response.status()).toBe(HTTP_STATUS.CREATED);  // 201, not 200!
const created = (await response.json()) as Post;
expect(created.id).toBeGreaterThan(0);
```

**Pattern 4 — Parallel requests with Promise.all:**
```typescript
const [response1, response2] = await Promise.all([
  apiClient.get(ENDPOINTS.POSTS),
  apiClient.get(ENDPOINTS.USERS),
]);
// Both requests run at the same time — faster than sequential
```

**Pattern 5 — Check every item in an array:**
```typescript
const posts = await apiClient.getJson<Post[]>(ENDPOINTS.POSTS);
posts.forEach((post) => {
  expect(post.userId).toBeGreaterThan(0);  // runs once per post
});
```

**Pattern 6 — Schema validation with toMatchObject:**
```typescript
expect(post).toMatchObject({
  id:     expect.any(Number),  // must be a number (any number)
  title:  expect.any(String),  // must be a string (any string)
  userId: expect.any(Number),
});
// Passes even if post has extra fields — flexible schema check
```

---

## 9. The Playwright Config File

`playwright.config.ts` is the master settings file. Key sections:

```typescript
export default defineConfig({
  testDir: './tests',      // Where to find test files
  timeout: 30_000,         // Max 30 seconds per test
  retries: process.env.CI ? 2 : 0,  // CI: retry twice; Local: fail immediately
  workers: process.env.CI ? 4 : undefined,  // CI: 4 parallel; Local: auto

  use: {
    baseURL: 'https://jsonplaceholder.typicode.com',  // Prepended to all paths
    extraHTTPHeaders: {
      'Content-Type': 'application/json',   // Sent with every request
      'Accept': 'application/json',
    },
  },

  projects: [
    { name: 'smoke',       testMatch: '**/smoke/**/*.spec.ts' },
    { name: 'sanity',      testMatch: '**/sanity/**/*.spec.ts' },
    { name: 'integration', testMatch: '**/integration/**/*.spec.ts' },
    { name: 'regression',  testMatch: '**/regression/**/*.spec.ts' },
    { name: 'all',         testMatch: '**/*.spec.ts' },
  ],
});
```

**Projects** let you target a specific group:
```bash
npx playwright test --project=smoke      # only smoke tests
npx playwright test --project=regression # only regression tests
npx playwright test                      # default: 'all' project
```

---

## 10. Environment Files (.env)

Environment files control how the framework behaves without changing code.

```
.env              ← Your local settings (gitignored — never committed)
.env.example      ← Template showing all available variables (committed)
.env.staging      ← Staging server settings (gitignored)
```

**Contents of `.env` (your local dev settings):**
```bash
NODE_ENV=development
BASE_URL=https://jsonplaceholder.typicode.com
ALLURE_RESULTS=false
CI=false
```

**To point the tests at a different API:**
```bash
# In .env:
BASE_URL=https://my-staging-api.example.com

# Or in terminal (overrides .env):
BASE_URL=http://localhost:3000 npm test
```

**To enable Allure reporting:**
```bash
ALLURE_RESULTS=true npm test     # generates allure-results/ folder
npm run allure:report            # converts to HTML
npm run allure:open              # opens in browser
```

---

## 11. Docker — Containerised Runs

Docker packages the tests + Node.js + Playwright browsers into a single image.
Once built, it runs identically on your laptop, on Jenkins, on any server.

### The Dockerfile (multi-stage build)

```dockerfile
# Stage 1: Install npm dependencies in a small Node image
FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Use the official Playwright image (has browsers pre-installed)
FROM mcr.microsoft.com/playwright:v1.44.0-jammy AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules  ← copy deps from stage 1
COPY . .                                            ← copy our project files
ENV NODE_ENV=ci CI=true                             ← set environment variables
RUN mkdir -p reports playwright-report              ← create output directories
RUN useradd -r tester && chown -R tester /app       ← non-root user (security)
USER tester
ENTRYPOINT ["npx", "playwright", "test"]            ← always run Playwright
CMD ["--reporter=html,junit"]                       ← default reporters
```

**Why two stages?**
The `node:20-slim` image is used for `npm install` because it's small and fast.
The Playwright image (which has Chrome/Firefox installed) is the final image.
We copy only the installed `node_modules` across — not the entire Node install.
Result: a smaller final image.

### docker-compose.yml

Defines named services so you don't need to remember long `docker run` commands.

```bash
# Run all tests
docker compose up api-tests

# Run only smoke tests
docker compose up api-tests-smoke

# Run regression tests
docker compose up api-tests-regression

# Start Allure server (view results at http://localhost:5050)
docker compose --profile allure up allure-report
```

**Reports are accessible on your machine** because docker-compose mounts directories:
```yaml
volumes:
  - ./playwright-report:/app/playwright-report  ← host:container
  - ./reports:/app/reports
```
Whatever the container writes to `/app/playwright-report` appears in
`./playwright-report` on your host machine.

---

## 12. Jenkins — CI/CD Pipeline

The `Jenkinsfile` defines what happens when code is pushed to the repository.
Jenkins reads this file and executes each stage in order.

### Pipeline Stages

```
┌─────────────┐
│  1. Checkout│ ← git clone the repository
└──────┬──────┘
       │
┌──────▼──────┐
│  2. Install │ ← npm ci (clean install)
└──────┬──────┘
       │
┌──────▼──────┐
│   3. Lint   │ ← tsc --noEmit (type check) + eslint
└──────┬──────┘
       │ ← if lint fails, pipeline stops here
┌──────▼──────┐
│ 4. Smoke    │ ← playwright test --project=smoke
└──────┬──────┘
       │ ← if smoke fails, pipeline stops here (server is down)
┌──────▼──────┐
│ 5. Sanity   │ ← playwright test --project=sanity
└──────┬──────┘
       │
┌──────▼──────┐
│6. Integration│ ← playwright test --project=integration
└──────┬──────┘
       │
┌──────▼──────┐
│7. Regression│ ← playwright test --project=regression
└──────┬──────┘
       │
┌──────▼──────┐
│  8. Report  │ ← generate Allure HTML report
└──────┬──────┘
       │
┌──────▼──────┐
│ 9. Archive  │ ← save HTML report and JUnit XML as build artifacts
└─────────────┘
```

**Key Jenkins concepts in our Jenkinsfile:**

```groovy
agent {
  docker { image 'mcr.microsoft.com/playwright:v1.44.0-jammy' }
}
// Runs the entire pipeline inside the Playwright Docker image.
// Jenkins pulls the image automatically — no manual browser setup needed.
```

```groovy
junit allowEmptyResults: true, testResults: 'reports/junit-results.xml'
// Jenkins reads the JUnit XML and shows test results in its dashboard
// with trend graphs across builds.
```

```groovy
publishHTML(target: [
  reportName: 'Playwright Test Report',
  reportDir:  'playwright-report',
  reportFiles: 'index.html',
  keepAll: true,                  // Keep reports for every build, not just latest
  alwaysLinkToLastBuild: true,
])
// Adds a link "Playwright Test Report" to the Jenkins build page.
// Click it to see the full interactive HTML report.
```

```groovy
post {
  always { cleanWs() }   // Delete the workspace after every build
  failure { echo "Tests FAILED. Check report at: ${BUILD_URL}..." }
}
```

---

## 13. Running Tests Step by Step

### Prerequisites
- Node.js 18 or higher (`node --version` to check)
- Internet connection (tests call a live API)

### Step 1 — Install dependencies
```bash
cd E:\API_Automation_PlayW
npm install
```
This reads `package.json` and downloads all libraries into `node_modules/`.

### Step 2 — Install Playwright browsers
```bash
npx playwright install
```
Downloads Chromium, Firefox, and WebKit. Only needed once.
For API testing, these browsers aren't actually used, but Playwright requires them.

### Step 3 — Run your first test
```bash
npm run test:smoke
```
Expected output:
```
Running 4 tests using 4 workers

  ok 1 [smoke] › tests/smoke/health-check.spec.ts:7:3 › Smoke: API Health Checks › GET /posts returns 200 ...
  ok 2 [smoke] › tests/smoke/health-check.spec.ts:16:3 › GET /users returns 200 ...
  ok 3 [smoke] › tests/smoke/health-check.spec.ts:22:3 › GET /comments returns 200
  ok 4 [smoke] › tests/smoke/health-check.spec.ts:28:3 › GET /albums returns 200

  4 passed (6.0s)
```

### Step 4 — Run all suites
```bash
npm test            # runs 'all' project (every spec file)
npm run test:sanity
npm run test:integration
npm run test:regression
```

### Step 5 — View the HTML report
```bash
npx playwright show-report
```
Opens `playwright-report/index.html` in your browser.

### Step 6 — Run via Docker
```bash
docker compose up api-tests
```
Reports appear in `./playwright-report/` after the container exits.

---

## 14. Reading Test Output

### Terminal output (list reporter)

```
  ok 1 [smoke] › tests/smoke/health-check.spec.ts:7:3 › Smoke › GET /posts returns 200
  ✓  ↑    ↑              ↑                    ↑   ↑       ↑
  │  │    │              │                    │   │       └─ Test name
  │  │    │              │                    │   └──────── Line number in file
  │  │    │              │                    └──────────── File path
  │  │    │              └─────────────────────────────────  (relative path)
  │  │    └────────────────────────────────────────────────  Project name
  │  └─────────────────────────────────────────────────────  Test number
  └────────────────────────────────────────────────────────  ok = passed
```

### When a test fails

```
  × 3 [regression] › tests/posts/get-posts.spec.ts:23:3 › GET Posts › should fetch a single post

    Error: expect(received).toBe(expected)

    Expected: 1
    Received: 2

      21 |     const post = (await response.json()) as Post;
      22 |     expect(post.id).toBe(1);   ← failing assertion highlighted
    > 23 |     expect(post.id).toBe(1);
         |                     ^
```

The failure shows:
- Which file and line number
- What assertion failed
- What value was expected vs what was actually received

### Log output

```
[2024-01-15T10:23:45.123Z] [INFO]  GET /posts
[2024-01-15T10:23:45.456Z] [DEBUG] Response: 200 https://jsonplaceholder.typicode.com/posts
```

This comes from `helpers/logger.helper.ts`. The DEBUG line only appears when
`NODE_ENV=development` (logLevel is 'debug' in dev).

---

## 15. How to Add a New Test

### Example: adding a test for GET /todos

**Step 1 — Check if the type exists** (`types/api.types.ts`):
```typescript
// Already there!
export interface Todo {
  id: number; userId: number; title: string; completed: boolean;
}
```

**Step 2 — Add the endpoint** (`config/constants.ts`):
```typescript
// Already there!
export const ENDPOINTS = {
  TODOS: '/todos',
  ...
}
```

**Step 3 — Create the test file** (`tests/posts/get-todos.spec.ts`):
```typescript
import { test, expect } from '../../fixtures/api.fixture';
import { ENDPOINTS, HTTP_STATUS } from '../../config/constants';
import { ApiAssertions } from '../../helpers/assertions.helper';
import { Todo } from '../../types/api.types';

test.describe('GET Todos', () => {

  test('should fetch all todos', async ({ apiClient }) => {
    const todos = await apiClient.getJson<Todo[]>(ENDPOINTS.TODOS);
    ApiAssertions.assertArrayNotEmpty(todos);
  });

  test('should fetch a single todo', async ({ apiClient }) => {
    const todo = await apiClient.getJson<Todo>(`${ENDPOINTS.TODOS}/1`);
    expect(todo.id).toBe(1);
    expect(typeof todo.completed).toBe('boolean');
  });

  test('should return 404 for non-existent todo', async ({ apiClient }) => {
    const response = await apiClient.get(`${ENDPOINTS.TODOS}/99999`);
    expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND);
  });

});
```

**Step 4 — Run only the new test:**
```bash
npx playwright test tests/posts/get-todos.spec.ts
```

---

## 16. Common Errors and Fixes

### "Error: connect ECONNREFUSED"
**Meaning:** The API server is not reachable.
**Fix:** Check your internet connection. Verify `BASE_URL` in `.env` is correct.

### "Error: Test timeout of 30000ms exceeded"
**Meaning:** A request took longer than 30 seconds.
**Fix:** Check internet. Increase `timeout` in `playwright.config.ts` or in `.env.staging`.

### "Expected: 200, Received: 404"
**Meaning:** The endpoint path is wrong.
**Fix:** Check `ENDPOINTS` in `constants.ts`. Verify the path in the API docs.

### "Property 'xyz' does not exist on type 'Post'"
**Meaning:** TypeScript found a typo or missing field in `types/api.types.ts`.
**Fix:** Check the interface definition and the actual API response to see what fields exist.

### "Cannot find module '../../fixtures/api.fixture'"
**Meaning:** Import path is wrong — count the `../` levels.
**Fix:** From `tests/posts/`, you need `../../fixtures/api.fixture` (two levels up).
  From `tests/smoke/`, same: `../../fixtures/api.fixture`.

### npm install fails with "Unsupported engine"
**Meaning:** Your Node.js version is too old.
**Fix:** `node --version` — must be 18 or higher. Update Node.js if needed.

---

## Quick Reference Card

```bash
# Run specific test suites
npm run test:smoke          # fast gate: is the server alive?
npm run test:sanity         # basic CRUD per resource
npm run test:integration    # cross-resource relationships
npm run test:regression     # full edge-case coverage
npm test                    # everything

# Run a single file
npx playwright test tests/posts/get-posts.spec.ts

# Run tests matching a keyword in the test name
npx playwright test -g "should fetch all posts"

# Show HTML report after running
npx playwright show-report

# Run in Docker
docker compose up api-tests
docker compose up api-tests-smoke

# Type-check without running tests
npm run typecheck

# Fix lint issues automatically
npm run lint:fix
```
