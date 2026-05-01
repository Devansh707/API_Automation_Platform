  # GitHub Actions CI/CD — Integration Guide & Notes

> Covers how this project is wired into GitHub Actions, what every line of the workflow does, and how to extend it.

---

## Table of Contents

1. [What is GitHub Actions?](#1-what-is-github-actions)
2. [Project Workflow at a Glance](#2-project-workflow-at-a-glance)
3. [Workflow File — Line-by-Line Explanation](#3-workflow-file--line-by-line-explanation)
4. [How the Matrix Strategy Works](#4-how-the-matrix-strategy-works)
5. [How Playwright Config Adapts to CI](#5-how-playwright-config-adapts-to-ci)
6. [Viewing Results on GitHub](#6-viewing-results-on-github)
7. [Secrets & Environment Variables](#7-secrets--environment-variables)
8. [Branch Protection Rules](#8-branch-protection-rules)
9. [Status Badge](#9-status-badge)
10. [Extending the Workflow](#10-extending-the-workflow)
11. [Common Failures & Fixes](#11-common-failures--fixes)

---

## 1. What is GitHub Actions?

GitHub Actions is a CI/CD platform built into GitHub. It watches your repository for events (a push, a PR, a schedule) and runs automated jobs on GitHub-hosted machines called **runners**.

```
You push code
      │
      ▼
GitHub detects the event
      │
      ▼
Spins up a fresh Ubuntu VM (runner)
      │
      ▼
Runs every step in your workflow YAML
      │
      ▼
Reports pass / fail back to the commit / PR
```

Key concepts:

| Term | What it is |
|---|---|
| **Workflow** | A YAML file inside `.github/workflows/` — defines what to run |
| **Job** | A group of steps that run on the same runner |
| **Step** | A single shell command or reusable action |
| **Action** | A pre-built, versioned step from the marketplace (e.g. `actions/checkout@v4`) |
| **Runner** | The virtual machine that executes the job (`ubuntu-latest` = Ubuntu 22.04) |
| **Artifact** | A file or folder saved after the job for download (reports, screenshots) |

---

## 2. Project Workflow at a Glance

**File location:** `.github/workflows/api-tests.yml`

```
Trigger (push / PR / schedule / manual)
        │
        ▼
┌──────────────────────────────────────┐
│  Job: test  (runs 4 times in parallel) │
│                                        │
│  Matrix: smoke | sanity | integration | regression
│                                        │
│  Steps (each matrix run):             │
│  1. Checkout code                     │
│  2. Setup Node 24 (from .nvmrc)       │
│  3. npm ci                            │
│  4. cp .env.example .env              │
│  5. Lint + Typecheck                  │
│  6. Run <suite> tests                 │
│  7. Upload playwright-report artifact │
└──────────────────────────────────────┘
```

The four matrix runs execute **simultaneously** on four separate VMs, so total CI time ≈ the slowest single suite (~60s regression), not the sum of all suites.

---

## 3. Workflow File — Line-by-Line Explanation

```yaml
name: API Tests CI/CD
```
The display name shown on GitHub's Actions tab.

---

### Triggers (`on:`)

```yaml
on:
  push:
    branches: ["main", "develop"]
  pull_request:
    branches: ["main", "develop"]
  workflow_dispatch:
  schedule:
    - cron: "30 2 * * *"
```

| Trigger | When it fires |
|---|---|
| `push` | Every commit pushed directly to `main` or `develop` |
| `pull_request` | Every time a PR targeting `main` or `develop` is opened, updated, or synchronized |
| `workflow_dispatch` | Manual run from the GitHub UI (Actions → Run workflow button) |
| `schedule` | Nightly at 02:30 UTC — catches API regressions even with no code changes |

> **Cron syntax:** `30 2 * * *` → minute 30, hour 2, every day, every month, every weekday.
> GitHub Actions cron runs in UTC.

---

### Job definition

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
```

- `ubuntu-latest` = Ubuntu 22.04 LTS hosted by GitHub (free for public repos, included minutes for private).
- Each matrix entry gets its own fresh VM — no shared state between suites.

---

### Matrix strategy

```yaml
    strategy:
      fail-fast: false
      matrix:
        suite: [smoke, sanity, integration, regression]
```

- `matrix` creates one job per value in `suite`. All four run in parallel.
- `fail-fast: false` — if the smoke suite fails, the other three keep running. Without this, one failure would cancel everything, losing the other results.

---

### Steps

#### Step 1 — Checkout

```yaml
      - name: Checkout
        uses: actions/checkout@v4
```

Clones your repository into the runner's working directory (`/home/runner/work/<repo>/`).
`@v4` pins to the v4 major release of the action — always use pinned versions to avoid unexpected changes.

---

#### Step 2 — Setup Node

```yaml
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: npm
```

- `node-version-file: ".nvmrc"` — reads your `.nvmrc` file (currently `24`) and installs that exact Node version. One source of truth for Node version across local dev and CI.
- `cache: npm` — caches the npm module cache (`~/.npm`) between runs keyed on `package-lock.json`. When `package-lock.json` hasn't changed, `npm ci` skips downloading packages and restores from cache. Saves ~30–60 seconds per run.

---

#### Step 3 — Install dependencies

```yaml
      - name: Install dependencies
        run: npm ci
```

`npm ci` (clean install):
- Deletes `node_modules`, installs exactly what's in `package-lock.json`.
- Fails if `package.json` and `package-lock.json` are out of sync.
- Never use `npm install` in CI — it can silently update the lock file.

---

#### Step 4 — Create env file

```yaml
      - name: Create env file
        run: cp .env.example .env
```

The runner has no `.env` file (it's in `.gitignore`). This copies `.env.example` to `.env` so `playwright.config.ts` can load it with `dotenv`.

> For private APIs, replace this step with GitHub Secrets (see [Section 7](#7-secrets--environment-variables)).

---

#### Step 5 — Lint + Typecheck

```yaml
      - name: Lint + Typecheck
        run: |
          npm run lint
          npm run typecheck
```

Runs ESLint and `tsc --noEmit` before any tests. If there's a type error or linting violation, the job fails here — fast feedback before spending time running tests.

---

#### Step 6 — Run suite

```yaml
      - name: Run ${{ matrix.suite }} suite
        run: npx playwright test --project=${{ matrix.suite }}
```

`${{ matrix.suite }}` is replaced at runtime with the current matrix value (e.g., `smoke`).
This runs: `npx playwright test --project=smoke` (or sanity / integration / regression).

The `--project` flag maps directly to the `projects` array in `playwright.config.ts`.

---

#### Step 7 — Upload artifact

```yaml
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.suite }}
          path: |
            playwright-report/
            test-results/
```

- `if: always()` — uploads the report even when tests fail. Critical for debugging failures.
- Creates a downloadable zip named `playwright-report-smoke`, `playwright-report-regression`, etc.
- Artifacts are kept for 90 days by default (configurable with `retention-days:`).

---

## 4. How the Matrix Strategy Works

Without a matrix, you'd need to write four identical jobs. With matrix, GitHub expands one job definition into N parallel jobs:

```
matrix: [smoke, sanity, integration, regression]
                    │
        ┌───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼
   job: smoke  job: sanity  job: integ  job: regress
   (VM #1)     (VM #2)      (VM #3)     (VM #4)
```

All four VMs start at the same time. Total wall-clock time = slowest job (regression ~60s), not 5+15+30+60 = 110s.

---

## 5. How Playwright Config Adapts to CI

GitHub Actions automatically sets `CI=true` as an environment variable on every runner. Your `playwright.config.ts` reads this:

```typescript
retries: process.env.CI ? 2 : 0,   // Retry flaky tests 2x in CI, 0x locally
workers: process.env.CI ? 4 : undefined,  // 4 parallel workers in CI
```

And the env file step sets:
```
NODE_ENV=development
BASE_URL=https://jsonplaceholder.typicode.com
```

So `playwright.config.ts` builds the full config correctly without any manual intervention.

---

## 6. Viewing Results on GitHub

### During a run
Go to: `GitHub repo → Actions tab → click the workflow run`

You'll see the four matrix jobs running in parallel with live logs.

### After a run — download reports
1. Click into a completed workflow run.
2. Scroll to the **Artifacts** section at the bottom.
3. Download `playwright-report-smoke`, `playwright-report-regression`, etc.
4. Unzip and open `playwright-report/index.html` in your browser.

### PR checks
When a PR targets `main` or `develop`, each matrix job appears as a separate required check on the PR page:
```
✅ test (smoke)
✅ test (sanity)
✅ test (integration)
❌ test (regression)   ← blocks merge if branch protection is on
```

---

## 7. Secrets & Environment Variables

The current setup uses `.env.example` defaults, which is fine for JSONPlaceholder (public API, no auth). For real projects with private APIs or auth tokens:

### Adding a secret to GitHub
1. Go to: `Repo → Settings → Secrets and variables → Actions → New repository secret`
2. Add e.g. `API_BASE_URL`, `API_KEY`

### Using secrets in the workflow

```yaml
      - name: Create env file
        env:
          BASE_URL: ${{ secrets.API_BASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          echo "BASE_URL=$BASE_URL" >> .env
          echo "API_KEY=$API_KEY" >> .env
```

Or pass them directly to the test step:

```yaml
      - name: Run ${{ matrix.suite }} suite
        env:
          BASE_URL: ${{ secrets.API_BASE_URL }}
        run: npx playwright test --project=${{ matrix.suite }}
```

> **Never hardcode secrets in YAML files.** GitHub will scan for leaked secrets and alert you, but prevention is better.

### Environment-level secrets (staging vs prod)

For multiple environments, use GitHub Environments:
1. `Repo → Settings → Environments → New environment` (e.g., `staging`, `production`)
2. Add secrets per environment.
3. Reference in the job:

```yaml
jobs:
  test:
    environment: staging
    runs-on: ubuntu-latest
```

---

## 8. Branch Protection Rules

To make CI a hard gate (block merging if tests fail):

1. Go to: `Repo → Settings → Branches → Add branch protection rule`
2. Branch name pattern: `main`
3. Enable:
   - ✅ **Require status checks to pass before merging**
   - Search for and add: `test (smoke)`, `test (sanity)`, `test (integration)`, `test (regression)`
   - ✅ **Require branches to be up to date before merging**
4. Optionally enable:
   - ✅ **Require pull request reviews before merging** (1 approver)
   - ✅ **Do not allow bypassing the above settings** (applies to admins too)

Now no one can merge a PR that breaks any test suite.

---

## 9. Status Badge

Add a live build status badge to your README. Replace `<USERNAME>` and `<REPO>`:

```markdown
[![API Tests](https://github.com/<USERNAME>/<REPO>/actions/workflows/api-tests.yml/badge.svg)](https://github.com/<USERNAME>/<REPO>/actions/workflows/api-tests.yml)
```

For this repo:

```markdown
[![API Tests](https://github.com/Devansh707/API_Automation_PlayW/actions/workflows/api-tests.yml/badge.svg)](https://github.com/Devansh707/API_Automation_PlayW/actions/workflows/api-tests.yml)
```

The badge turns green (passing) or red (failing) automatically.

---

## 10. Extending the Workflow

### A — Publish Allure report to GitHub Pages

```yaml
      - name: Run regression with Allure
        if: matrix.suite == 'regression'
        env:
          ALLURE_RESULTS: "true"
        run: npx playwright test --project=regression --reporter=allure-playwright

      - name: Generate Allure report
        if: matrix.suite == 'regression'
        run: npm run allure:report

      - name: Deploy to GitHub Pages
        if: matrix.suite == 'regression'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./allure-report
```

Enable GitHub Pages in `Repo → Settings → Pages → Source: gh-pages branch`.

---

### B — Slack notification on failure

```yaml
      - name: Notify Slack on failure
        if: failure()
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "❌ Tests failed on `${{ github.ref_name }}` — suite: ${{ matrix.suite }}\n${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

### C — Run only affected tests on PRs (save CI minutes)

```yaml
      - name: Run suite
        run: |
          if [ "${{ github.event_name }}" == "pull_request" ] && [ "${{ matrix.suite }}" == "regression" ]; then
            npx playwright test --project=regression --grep-invert @slow
          else
            npx playwright test --project=${{ matrix.suite }}
          fi
```

---

### D — Add artifact retention control

```yaml
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.suite }}
          path: playwright-report/
          retention-days: 30
```

---

## 11. Common Failures & Fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module` | `node_modules` missing | Check `npm ci` step ran; ensure `package-lock.json` is committed |
| `.nvmrc` error | File not found or malformed | Confirm `.nvmrc` contains just `24` (no extra chars) |
| `cp: cannot stat '.env.example'` | `.env.example` not committed | Commit `.env.example` to the repo |
| Tests pass locally, fail in CI | Missing env var | Compare `.env` with what the CI env step creates |
| `ECONNREFUSED` on BASE_URL | Wrong URL in `.env.example` | Verify `BASE_URL` is reachable from a public GitHub runner |
| Matrix job cancelled mid-run | `fail-fast: true` (default) | Set `fail-fast: false` (already done in this project) |
| Artifacts missing after run | `if: always()` not set | Upload step only runs when job succeeds by default — add `if: always()` |
| Old Node version installed | `.nvmrc` ignored | Confirm `node-version-file: ".nvmrc"` is set in `setup-node` step |

---

## Quick Reference — Useful `gh` CLI Commands

If you have the [GitHub CLI](https://cli.github.com/) installed:

```bash
# Watch the latest workflow run live
gh run watch

# List recent runs
gh run list --workflow=api-tests.yml

# Download artifacts from the latest run
gh run download --name playwright-report-regression

# Manually trigger the workflow
gh workflow run api-tests.yml

# View run logs
gh run view --log
```

---

*Last updated: 2026-04-30*
