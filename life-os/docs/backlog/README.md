# LifeOS backlog index

This is the delivery source of truth. Ticket status begins as `Backlog` unless `CURRENT-STATUS.md` says otherwise. A ticket moves to `Ready` only after dependency and specification review.

Workflow rules: [BACKLOG-WORKFLOW.md](../BACKLOG-WORKFLOW.md). Current ledger: [STATUS.md](./STATUS.md).

## Ticket format

Each row contains the intended outcome plus minimum acceptance contract. Implementers expand the row using `docs/TICKET-TEMPLATE.md` in the PR or tracker without weakening it.

## Epics

| Epic | Name | Phase | Gate |
| --- | --- | --- | --- |
| [EPIC-00](./EPIC-00-GOVERNANCE.md) | Governance and repository readiness | 0 | Shared context, branches, CI, and work tracking are usable. |
| [EPIC-01](./EPIC-01-PRODUCT-UX.md) | Product and UX specification | 0 | Scope, journeys, IA, states, and wireframes are approved. |
| [EPIC-02](./EPIC-02-ENGINEERING-FOUNDATION.md) | Engineering foundation | 1 | Web, API, database, local stack, and CI compile/test. |
| [EPIC-03](./EPIC-03-DESIGN-SYSTEM-ATOMS.md) | Design system foundations and atoms | 1 | Every atomic component is accessible and independently verified. |
| [EPIC-04](./EPIC-04-COMPOSED-COMPONENTS.md) | Composed components and application patterns | 1 | Reusable feature-neutral patterns cover all screen needs. |
| [EPIC-05](./EPIC-05-IDENTITY.md) | Identity, onboarding, account, and privacy | 2 | Verified users securely enter a private shell. |
| [EPIC-06](./EPIC-06-SHELL-TODAY.md) | Navigation, application shell, and Today | 2 | Responsive private shell and useful empty/real Today views work. |
| [EPIC-07](./EPIC-07-PROJECTS.md) | Projects and project details | 3 | Project lifecycle and details work end to end. |
| [EPIC-08](./EPIC-08-TASKS.md) | Tasks and task details | 3 | Complete task lifecycle, subtasks, dependencies, labels, comments, activity. |
| [EPIC-09](./EPIC-09-TIME-CALENDAR-FOCUS.md) | Time blocks, calendar, and focus | 3 | Schedule/focus/complete journey handles conflicts and timezones. |
| [EPIC-10](./EPIC-10-PLANNING-REVIEWS.md) | Sprints, week planning, and reviews | 4 | Weekly planning and daily/weekly/monthly reflection persist accurately. |
| [EPIC-11](./EPIC-11-GOALS-INSIGHTS.md) | Goals, progress, reports, and analytics | 4–5 | Goals and honest accessible analytics work with exports. |
| [EPIC-12](./EPIC-12-KNOWLEDGE-HABITS.md) | Notes, brain dump, and habits | 4 | Capture, organize, autosave, convert, and habit tracking work. |
| [EPIC-13](./EPIC-13-PLATFORM-FEATURES.md) | Search, notifications, recurrence, files | 5 | Cross-product services are safe, useful, and resilient. |
| [EPIC-14](./EPIC-14-BACKEND-OPERATIONS.md) | Backend cross-cutting capabilities | 5 | Jobs, mail, audit, OpenAPI, observability, and performance are ready. |
| [EPIC-15](./EPIC-15-QUALITY-SECURITY.md) | Quality, accessibility, security, and resilience | 6 | Launch quality/security gates pass. |
| [EPIC-16](./EPIC-16-INFRA-LAUNCH.md) | VPS, Cloudflare, deployment, and launch | 6 | Tagged `master` release runs safely in production with restore/rollback. |
| [EPIC-17](./EPIC-17-FUTURE.md) | Controlled future discovery | Future | Discovery/ADR only; no implied commitment. |

## Universal ticket context

Every ticket reads `AGENTS.md`, `01-PRODUCT-CONTEXT.md`, `09-DEFINITION-OF-DONE.md`, the relevant specification section, and its dependencies. Security-sensitive tickets also read `06-SECURITY.md`; UI tickets read `03-DESIGN-SYSTEM.md` and `12-UX-STATES.md`; API tickets read `05-API-CONVENTIONS.md`.
