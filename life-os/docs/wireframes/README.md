# LifeOS low-fidelity wireframes

These wireframes define hierarchy, responsive order, component boundaries and states. They intentionally omit final color, typography, icon choices and pixel polish.

## Notation

- `[A]` atomic component from Epic 03.
- `[C]` composed shared pattern from Epic 04.
- `[F]` feature-specific component built before its screen.
- `{route}` canonical navigation target.
- `(*)` primary action.
- `[optional]` omitted when unavailable or out of scope.

## Responsive frames

```text
LARGE >= 1200                      MEDIUM 768–1199              SMALL < 768
┌─────────┬───────────────────┐    ┌────┬──────────────────┐    ┌─────────────────────┐
│ sidebar │ top utilities     │    │rail│ top utilities    │    │ menu  title  actions│
│         ├───────────────────┤    │    ├──────────────────┤    ├─────────────────────┤
│         │ page content      │    │    │ page content     │    │ single-column       │
│         │ + detail panel    │    │    │ + drawer         │    │ content / full sheet│
└─────────┴───────────────────┘    └────┴──────────────────┘    └─────────────────────┘
```

Large content uses a 12-column grid. Medium uses 8 columns. Small uses one reading column; dense tables become labelled record cards. Core flows never require page-level horizontal scrolling.

## Screen package

- [Authentication and onboarding](./01-AUTH-ONBOARDING.md)
- [Application shell and Today](./02-SHELL-TODAY.md)
- [Projects, tasks, scheduling and focus](./03-WORK-EXECUTION.md)
- [Sprints, week planning, goals and habits](./04-PLANNING-GROWTH.md)
- [Notes, Brain Dump, progress, reports, reviews and settings](./05-KNOWLEDGE-REFLECTION.md)
- [Cross-cutting states, drawers and dialogs](./06-STATES-OVERLAYS.md)

## Route coverage

| Family | Routes covered |
| --- | --- |
| Public/auth | `/life-os`, signup, login, verify, recovery, privacy, terms, unavailable/not-found |
| Onboarding | `/life-os/app/onboarding` |
| Execute | Today, Tasks/detail, Time Blocks, Calendar, Focus |
| Plan | Projects/detail, Sprints/detail, Week Planner, Goals/detail |
| Capture/grow | Notes/detail, Brain Dump, Habits/detail |
| Reflect | Progress, Reports, Daily/Weekly/Monthly Reviews |
| Global/settings | Search, Notifications, Settings sections, Quick Add, Account menu |

## Composition gate

A screen may be implemented only after each marked `[A]`, `[C]` and `[F]` dependency has a completed ticket, catalogue example, accessibility behavior and tests. If implementation uncovers a reusable primitive absent from the component map, create its own ticket before continuing.
