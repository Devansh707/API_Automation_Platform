# API Automation — Playwright + TypeScript

End-to-end API automation framework testing [JSONPlaceholder](https://jsonplaceholder.typicode.com)
using Playwright's `APIRequestContext`, TypeScript, Docker, and Jenkins CI/CD.

## Stack

| Tool | Purpose |
|---|---|
| Playwright 1.44 | API test runner & assertions |
| TypeScript 5.4 | Type safety across the whole project |
| dotenv | Environment configuration |
| ESLint + Prettier | Code quality |
| Allure | Optional rich HTML reporting |
| Docker | Containerised test runner |
| Jenkins | CI/CD pipeline |

---

## Quick Start (Local)

### Prerequisites
- Node.js >= 18
- npm >= 9

```bash
# 1. Install dependencies
npm ci

# 2. Copy environment file
cp .env.example .env

# 3. Run all tests
npm test

# 4. Run specific test suite
npm run test:smoke
npm run test:sanity
npm run test:integration
npm run test:regression

# 5. View HTML report
npx playwright show-report
```

---

## Test Suites

| Suite | Command | Purpose | Speed |
|---|---|---|---|
| **Smoke** | `npm run test:smoke` | Connectivity + HTTP 200 checks | ~5s |
| **Sanity** | `npm run test:sanity` | Happy-path per resource | ~15s |
| **Integration** | `npm run test:integration` | Cross-resource data flows | ~30s |
| **Regression** | `npm run test:regression` | Full CRUD + edge cases | ~60s |
| **All** | `npm test` | Complete test suite | ~2m |

---

## Run with Docker

```bash
# Build and run all tests
docker compose up api-tests

# Run specific suites
docker compose up api-tests-smoke
docker compose up api-tests-sanity
docker compose up api-tests-integration
docker compose up api-tests-regression

# Start Allure server on http://localhost:5050
docker compose --profile allure up allure-report
```

Reports are written to `./playwright-report/` and `./reports/` on your host machine via volume mounts.

---

## Environment Configuration

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Selects the environment config block |
| `BASE_URL` | `https://jsonplaceholder.typicode.com` | API under test |
| `ALLURE_RESULTS` | `false` | Set to `true` to generate Allure data |
| `CI` | `false` | Enables retries and parallel workers |

Copy `.env.example` to `.env` — never commit `.env` with real secrets.

---

## Project Structure

```
tests/
  smoke/          — fast connectivity gate (~4 tests)
  sanity/         — happy-path per resource (~5 tests)
  integration/    — cross-resource flows (~7 tests)
  regression/     — exhaustive CRUD + edge cases (~20 tests)
  posts/          — unit-style per-endpoint tests
  users/          — unit-style per-endpoint tests
  comments/       — unit-style per-endpoint tests
fixtures/
  api.fixture.ts       — injects ApiClient via test.extend
  test-data.fixture.ts — seed/teardown fixture
helpers/
  api.client.ts        — wraps APIRequestContext
  assertions.helper.ts — reusable assertion methods
  logger.helper.ts     — level-aware logger
types/            — TypeScript interfaces matching API schemas
config/
  environments.ts — per-env config object
  constants.ts    — endpoint paths and HTTP status codes
```

---

## CI / Jenkins

The `Jenkinsfile` defines a declarative pipeline running on `mcr.microsoft.com/playwright:v1.44.0-jammy`:

| Stage | Purpose |
|---|---|
| Checkout | Clone repo, log commit info |
| Install | `npm ci` |
| Lint | TypeScript type-check + ESLint |
| Smoke Tests | Fast gate — fail early if API is unreachable |
| Sanity Tests | Happy-path gate before heavy testing |
| Integration Tests | Cross-resource flow verification |
| Regression Tests | Full CRUD + edge cases with all reporters |
| Report | Generate Allure HTML report |
| Archive | Publish Playwright HTML report + archive artifacts |

HTML report: `<Jenkins-URL>/job/<pipeline>/lastBuild/Playwright_Test_Report/`

---

## Generating Allure Report Locally

```bash
# Run tests with Allure output
ALLURE_RESULTS=true npm test

# Generate and open (requires allure CLI: https://allurereport.org/docs/install/)
npm run allure:report
npm run allure:open
```
