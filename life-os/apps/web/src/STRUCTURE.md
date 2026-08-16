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

`app/environment.ts` is the typed public-configuration boundary used by both Vite startup and the browser bootstrap. Feature code consumes validated configuration through the application boundary rather than reading `import.meta.env` directly.

## Enforced rules

`npm run verify:boundaries` checks every JavaScript/TypeScript source file and fails when:

- a relative import crosses its app, feature, shared-component, route, library, state, hook, type, style, asset, or test boundary;
- code outside a feature or shared component category imports a private file instead of its public entrypoint;
- a feature uses a subfolder other than `api`, `components`, `hooks`, `model`, or `test`;
- a feature or shared component category has no public `index.ts`/`index.tsx`;
- a route file declares anything other than one exported component whose name ends in `Route`.

Route modules compose imported feature/shared components. They do not declare local atoms or reach into feature internals. ESLint and the general quality gate supplement this architecture contract; the boundary verifier remains a separate required check.

`npm run verify:tokens` checks every stylesheet and source file under `src/` and fails when a file other than `styles/tokens.css` contains a raw hex, `rgb()`, `hsl()` or `color()` value, sets a color property to a named CSS color, or reads the private `--palette-*` layer. Components consume the semantic `--lifeos-*` tokens only.

## Quality and test boundary

- Prettier owns deterministic source/document formatting; ESLint owns JavaScript/TypeScript correctness, React Hooks, Vite refresh and static JSX accessibility rules.
- The TypeScript compiler remains the authoritative type checker. Babel parses TypeScript syntax for ESLint without replacing `tsc` semantic checks.
- Vitest and Testing Library own unit/component tests in `src/**/*.test.{ts,tsx}`.
- Shared setup, render helpers, user-event setup, the axe helper and deterministic data builders live in `src/test` and are imported through `@test/*`.
- Data builders use fixed identifiers/instants, reserved identity data and approved neutral copy. Time-dependent fixtures require an explicit valid IANA timezone and derive rather than hard-code the local date.
- The V8 coverage gate requires at least 80% statements, branches, functions and lines. Generated entrypoints, test support and the application bootstrap are excluded from the component-unit baseline.
- Axe runs WCAG rules supported by JSDOM. Color contrast still requires browser automation and manual review because JSDOM does not calculate layout or rendered colors. The frozen token pairings are proven separately by computing real WCAG ratios in `styles/tokens.test.ts`, which does not depend on a layout engine.
- `styles/tokens.css` is the runtime token source of truth and `styles/tokens.ts` mirrors the values TypeScript needs. `tests/design-tokens.test.mjs` parses the stylesheet in Node and fails when the two disagree, when a scale token leaves `rem`, when a font size drops below 12px, when an animated duration escapes the reduced-motion override, or when compact density would shrink a touch target below 44px.
