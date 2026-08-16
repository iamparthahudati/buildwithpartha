# LifeOS web

React 19 + TypeScript + Vite client for LifeOS. The application is independently built and served beneath `/life-os/`; protected product routes will later begin at `/life-os/app/`.

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer

## Local development

```bash
npm ci
npm run verify:dependencies
npm run dev
```

Open `http://localhost:5173/life-os/`. The development server intentionally rejects another process using the same port instead of silently moving LifeOS to a different URL.

Vite is the local same-origin gateway. Browser requests beneath `/life-os/api/` are forwarded unchanged to the Spring Boot service at `http://127.0.0.1:8080`; all other `/life-os/*` requests remain with the frontend and nested routes receive the SPA entry document. Use relative API URLs in browser code—do not call port `8080` directly or add local CORS.

For the local full stack, start PostgreSQL using [`infra/compose/README.md`](../../infra/compose/README.md), then run the API in a second terminal:

```bash
cd life-os/apps/api
set -a
source .env.example
set +a
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew bootRun
```

Run `npm run dev` here in a third terminal. The preview server applies the same proxy rule after `npm run build`.

## Validation

```bash
npm run format:check
npm run lint
npm run typecheck
npm run verify:boundaries
npm run verify:dependencies
npm run verify:gateway
npm run test:unit
npm run test:coverage
npm test
```

`npm test` checks formatting, ESLint, strict TypeScript, source-module boundaries and the 80% unit-coverage floor; then it creates a production build, proves that configured aliases resolve, verifies that the generated HTML loads its assets from `/life-os/assets/`, and starts disposable gateway/upstream servers to prove API routing wins before SPA fallback. Build output is written to `dist/` for the later Caddy/container tickets.

Vitest component tests use JSDOM, Testing Library, `user-event`, and the shared axe helper in `src/test`. Axe color-contrast checks are disabled only in JSDOM because it has no layout engine; browser automation and manual WCAG review remain required.

Use `npm install --package-lock-only` only in a dedicated dependency update ticket. Normal development and CI use `npm ci`; they never rewrite `package-lock.json`.

## Current boundary

LOS-0201 provides the executable frontend foundation and temporary readiness view. LOS-0207 adds public module entrypoints, TypeScript/Vite aliases, and an executable boundary gate. LOS-0208 adds the formatting, lint, component-test, accessibility-test and coverage baseline. LOS-0210 owns only the local same-origin proxy and fallback order; React Router, design tokens, production components, authentication and product screens remain owned by their later tickets.
