# QA and test strategy

## Automated layers

- Frontend unit/component: Vitest, Testing Library, user-event, axe checks for components.
- Backend unit: JUnit 5 for domain/application rules.
- Backend integration: Spring Boot + Testcontainers PostgreSQL; Flyway runs exactly as production.
- Contract: OpenAPI/schema compatibility and frontend API boundary validation.
- End to end: Playwright against the composed stack for critical journeys.
- Non-functional: dependency/secret/container scans, performance budgets, accessibility automation, backup/restore scripts.

The frontend unit baseline enforces 80% statements, branches, functions and lines through Vitest's V8 provider. Shared Testing Library render/user-event support and the axe helper live under `apps/web/src/test`. JSDOM cannot calculate layout-dependent color contrast, so that axe rule is disabled only in unit tests and must be covered by later browser automation plus manual WCAG 2.2 AA review.

The backend baseline uses JUnit, AssertJ and ArchUnit, with PostgreSQL Testcontainers support for integration tests. `./gradlew check` also enforces deterministic Spotless formatting, zero-error/zero-warning Checkstyle analysis, and JaCoCo line and branch coverage at a minimum of 80%. XML and HTML coverage reports are generated for CI and local review. The shared test container definition pins the same PostgreSQL image as local Compose; tests that start it require a Docker-compatible runtime.

The local gateway contract starts disposable Vite and mock-upstream servers. It proves `/life-os/api/*` paths and query strings are forwarded unchanged, API status/body responses are not replaced by HTML, nested `/life-os/*` UI routes receive the SPA document, and similarly prefixed UI paths do not cross the API boundary.

Environment tests exercise successful startup parsing plus missing, blank, malformed and sensitive-looking values. They assert that failures name every affected key without reproducing any value. Frontend test mode and the backend `test` profile supply deterministic public/non-secret values so the quality gates remain self-contained.

The API safety suite proves that expected, validation, malformed, missing-resource, authentication, authorization and unexpected failures share the versioned `application/problem+json` contract. Assertions reject diagnostic messages, causes, exception classes, stack traces, request-body values and unsafe caller correlation IDs. Filter tests cover safe ID reuse, replacement and response/request-context propagation. Health tests prove that only liveness/readiness are public, database readiness contributes without component disclosure, and actuator discovery, info and health-root access remain restricted.

The OpenAPI test requests the generated JSON through the authenticated runtime endpoint, validates OpenAPI 3.1 metadata, the empty-first paths contract, server path, session/CSRF schemes, standard Problem Details responses and pagination schema, then writes the exact checked response to `build/openapi/life-os-openapi.json`. The hosted backend job fails when the file is absent and retains it as the `life-os-openapi` artifact for 14 days.

The hosted `LifeOS CI` workflow runs for every pull request and push targeting a permanent branch. Its required jobs validate documentation/dependency/CI policy, execute the complete frontend gate plus a production environment build, execute the clean backend build (including formatting, static analysis, unit/architecture tests, coverage and the validated OpenAPI artifact), and scan complete Git history for secrets. Third-party actions are pinned to full commit SHAs; npm caching is lockfile-scoped and Gradle cache writes are limited to permanent-branch runs.

## Required test dimensions

- User: anonymous, unverified, verified, expired/revoked session, second user attempting cross-account access.
- Viewport/input: mobile touch, tablet, desktop, keyboard only, screen reader smoke.
- Data: none, one, typical, maximum expected page, long/Unicode content, archived/deleted relations.
- Time: timezone changes, DST, midnight, week/month/year boundaries, leap day.
- Network: slow, timeout before response, response lost after server commit, offline/reconnect, partial service failure.
- Concurrency: stale version, duplicate click/request, two tabs, job racing with manual edit.

## Release evidence

Each phase gate stores: test run summary, known accepted risks, migration rehearsal, screenshots only where useful, accessibility notes, performance result, security scan result, and rollback steps. Production smoke tests must not mutate real user data beyond a dedicated test account.
