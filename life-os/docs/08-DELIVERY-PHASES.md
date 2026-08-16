# Delivery phases

## Phase 0 — Planning and repository readiness

Epics 00–01. Approve product context, architecture, route map, backlog, branch protection, local environment, and CI skeleton.

Gate: a new contributor can find a ticket, start the stack, and understand product/security rules without oral context.

## Phase 1 — Foundations and component library

Epics 02–04. Build tokens, primitives, forms, feedback, data display, navigation, layout, and component documentation before any product screen.

Gate: all shared components have tests, accessibility states, responsive stories/examples, and no screen contains private one-off primitives.

## Phase 2 — Identity and application shell

Epics 05–06. Implement backend identity, signup/login/recovery, route protection, profile basics, responsive shell, global navigation, search/notification/focus entry points, and Today skeleton.

Gate: verified users can securely enter/leave a private empty LifeOS shell; unverified/anonymous users cannot access protected data.

## Phase 3 — Core execution

Epics 07–09. Projects, tasks, calendar/time blocks, and focus sessions.

Gate: create project -> create task -> schedule -> focus -> complete works end to end with correct ownership and timezone behavior.

## Phase 4 — Planning and growth

Epics 10–12. Sprints, weekly planning, progress, goals, notes, brain dump, and habits.

Gate: user can plan a week and review progress using real persisted data.

## Phase 5 — Insights and completeness

Epics 13–14. Search, notifications, reports, exports, audit, jobs, performance, and cross-cutting API maturity.

Gate: all reference navigation areas have functional v1 screens and resilient backend support.

## Phase 6 — Hardening and launch

Epics 15–16. Accessibility, security, performance, backup/restore, staging, Cloudflare, VPS deploy, monitoring, rollback, production launch.

Gate: security/quality launch checklist passes and `master` is deployed to `https://buildwithpartha.tech/life-os`.

