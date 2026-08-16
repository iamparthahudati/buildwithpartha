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

