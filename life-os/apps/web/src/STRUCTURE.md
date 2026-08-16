# Web source structure

```text
src/
  app/                 application bootstrap, providers, error boundaries
  assets/              imported fonts/images only
  components/
    ui/                 atoms: button, input, badge, progress, surface
    forms/              composed fields and form patterns
    feedback/           alerts, toast, empty/error, dialogs/drawers
    data-display/       metrics, tables, charts, timeline, activity
    navigation/         nav, tabs, breadcrumbs, menus
    layout/             page header, shell regions, responsive frames
  features/
    auth/ today/ projects/ tasks/ calendar/ time-blocks/ focus/
    sprints/ week-planner/ progress/ goals/ notes/ brain-dump/
    habits/ reports/ search/ notifications/ settings/
  hooks/                truly cross-feature React hooks
  lib/                  API boundary, dates, validation, utilities
  routes/               route-level composition; minimal business logic
  state/                minimal global ephemeral state
  styles/               tokens and global styles
  test/                 test setup, factories, render helpers
  types/                cross-cutting types only
```

Feature folders may contain `api`, `components`, `hooks`, `model`, and `test` subfolders. A feature must not import another feature's private internals; shared UI moves to the documented shared component category through its own ticket.

## Public module entrypoints

Every feature and shared component category exposes an `index.ts` public entrypoint. Code outside that feature/category imports the entrypoint rather than a private file:

```ts
import { TaskList } from "@features/tasks";
import { Button } from "@components/ui";
```

Inside one feature or component category, use relative imports. Relative imports must not cross a module boundary. Cross-boundary imports use one of the configured aliases:

| Alias           | Source boundary    |
| --------------- | ------------------ |
| `@app/*`        | `src/app/*`        |
| `@assets/*`     | `src/assets/*`     |
| `@components/*` | `src/components/*` |
| `@features/*`   | `src/features/*`   |
| `@hooks/*`      | `src/hooks/*`      |
| `@lib/*`        | `src/lib/*`        |
| `@routes/*`     | `src/routes/*`     |
| `@state/*`      | `src/state/*`      |
| `@styles/*`     | `src/styles/*`     |
| `@test/*`       | `src/test/*`       |
| `@types/*`      | `src/types/*`      |

Aliases are declared in both TypeScript and Vite so typechecking and production bundling resolve the same modules.

## Enforced rules

`npm run verify:boundaries` checks every JavaScript/TypeScript source file and fails when:

- a relative import crosses its app, feature, shared-component, route, library, state, hook, type, style, asset, or test boundary;
- code outside a feature or shared component category imports a private file instead of its public entrypoint;
- a feature uses a subfolder other than `api`, `components`, `hooks`, `model`, or `test`;
- a feature or shared component category has no public `index.ts`/`index.tsx`;
- a route file declares anything other than one exported component whose name ends in `Route`.

Route modules compose imported feature/shared components. They do not declare local atoms or reach into feature internals. ESLint and the general quality gate supplement this architecture contract; the boundary verifier remains a separate required check.

## Quality and test boundary

- Prettier owns deterministic source/document formatting; ESLint owns JavaScript/TypeScript correctness, React Hooks, Vite refresh and static JSX accessibility rules.
- The TypeScript compiler remains the authoritative type checker. Babel parses TypeScript syntax for ESLint without replacing `tsc` semantic checks.
- Vitest and Testing Library own unit/component tests in `src/**/*.test.{ts,tsx}`.
- Shared setup, render helpers, user-event setup and the axe helper live in `src/test` and are imported through `@test/*`.
- The V8 coverage gate requires at least 80% statements, branches, functions and lines. Generated entrypoints, test support and the application bootstrap are excluded from the component-unit baseline.
- Axe runs WCAG rules supported by JSDOM. Color contrast still requires browser automation and manual review because JSDOM does not calculate layout or rendered colors.
