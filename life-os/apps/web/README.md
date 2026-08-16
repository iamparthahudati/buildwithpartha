# LifeOS web

React 19 + TypeScript + Vite client for LifeOS. The application is independently built and served beneath `/life-os/`; protected product routes will later begin at `/life-os/app/`.

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer

## Local development

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/life-os/`. The development server intentionally rejects another process using the same port instead of silently moving LifeOS to a different URL.

## Validation

```bash
npm run typecheck
npm test
```

`npm test` creates a production build and verifies that the generated HTML loads its assets from `/life-os/assets/`. Build output is written to `dist/` for the later Caddy/container tickets.

## Current boundary

LOS-0201 provides only the executable frontend foundation and temporary readiness view. Routing, shared module boundaries, quality tooling, design tokens, components, authentication and product screens remain owned by their later tickets.
