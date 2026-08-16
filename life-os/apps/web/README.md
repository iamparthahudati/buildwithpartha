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

## Validation

```bash
npm run format:check
npm run lint
npm run typecheck
npm run verify:boundaries
npm run verify:dependencies
npm run test:unit
npm run test:coverage
npm test
```

`npm test` checks formatting, ESLint, strict TypeScript, source-module boundaries and the 80% unit-coverage floor; then it creates a production build, proves that configured aliases resolve, and verifies that the generated HTML loads its assets from `/life-os/assets/`. Build output is written to `dist/` for the later Caddy/container tickets.

Vitest component tests use JSDOM, Testing Library, `user-event`, and the shared axe helper in `src/test`. Axe color-contrast checks are disabled only in JSDOM because it has no layout engine; browser automation and manual WCAG review remain required.

Use `npm install --package-lock-only` only in a dedicated dependency update ticket. Normal development and CI use `npm ci`; they never rewrite `package-lock.json`.

## Current boundary

LOS-0201 provides the executable frontend foundation and temporary readiness view. LOS-0207 adds public module entrypoints, TypeScript/Vite aliases, and an executable boundary gate. LOS-0208 adds the formatting, lint, component-test, accessibility-test and coverage baseline. Routing, design tokens, production components, authentication and product screens remain owned by their later tickets.
