# ─── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --prefer-offline

# ─── Stage 2: Final test runner image ─────────────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.44.0-jammy AS runner

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

ENV NODE_ENV=ci
ENV CI=true
ENV BASE_URL=https://jsonplaceholder.typicode.com

RUN mkdir -p reports allure-results playwright-report

RUN groupadd -r tester && useradd -r -g tester tester \
    && chown -R tester:tester /app
USER tester

ENTRYPOINT ["npx", "playwright", "test"]
CMD ["--reporter=html,junit"]
