# QA and test strategy

## Automated layers

- Frontend unit/component: Vitest, Testing Library, user-event, axe checks for components.
- Backend unit: JUnit 5 for domain/application rules.
- Backend integration: Spring Boot + Testcontainers PostgreSQL; Flyway runs exactly as production.
- Contract: OpenAPI/schema compatibility and frontend API boundary validation.
- End to end: Playwright against the composed stack for critical journeys.
- Non-functional: dependency/secret/container scans, performance budgets, accessibility automation, backup/restore scripts.

## Required test dimensions

- User: anonymous, unverified, verified, expired/revoked session, second user attempting cross-account access.
- Viewport/input: mobile touch, tablet, desktop, keyboard only, screen reader smoke.
- Data: none, one, typical, maximum expected page, long/Unicode content, archived/deleted relations.
- Time: timezone changes, DST, midnight, week/month/year boundaries, leap day.
- Network: slow, timeout before response, response lost after server commit, offline/reconnect, partial service failure.
- Concurrency: stale version, duplicate click/request, two tabs, job racing with manual edit.

## Release evidence

Each phase gate stores: test run summary, known accepted risks, migration rehearsal, screenshots only where useful, accessibility notes, performance result, security scan result, and rollback steps. Production smoke tests must not mutate real user data beyond a dedicated test account.

