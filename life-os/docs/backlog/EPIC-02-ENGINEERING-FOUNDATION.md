# EPIC-02 — Engineering foundation

| ID | Ticket | Description and acceptance contract | Depends on |
| --- | --- | --- | --- |
| LOS-0201 | Bootstrap React application | Create React 19/TypeScript/Vite app in `apps/web`, set `/life-os/` base, scripts, strict TS, browser targets, and starter test. Production build assets use correct nested paths. | LOS-0010, LOS-0114 |
| LOS-0202 | Bootstrap Spring Boot API | Create Java 21 Spring Boot app with Gradle wrapper, web, validation, security, JPA, actuator, Flyway, mail, and test dependencies. App compiles/tests without external secrets. | LOS-0010, LOS-0114 |
| LOS-0203 | Establish dependency locking and update policy | Lock frontend/backend versions, commit lockfiles/wrappers, define automated update cadence and security override path. Unrelated tickets cannot silently upgrade platforms. | LOS-0201, LOS-0202 |
| LOS-0204 | Create PostgreSQL local service | Add local Compose Postgres with named volume, health check, non-production credentials, and reset instructions. DB is not exposed outside local need. | LOS-0202 |
| LOS-0205 | Add Flyway baseline | Configure profiles and first migration for extensions/schema metadata. Hibernate validates rather than creates schema; migration runs on clean and existing test DB. | LOS-0204 |
| LOS-0206 | Add backend package boundaries | Establish domain packages, common error/pagination types, dependency rules, and architecture test. Forbidden cross-domain/package dependencies fail tests. | LOS-0202 |
| LOS-0207 | Add frontend module boundaries | Establish app/components/features/routes/lib/state structure and import aliases/lint rules. Routes cannot reach feature internals or create new atoms. | LOS-0201 |
| LOS-0208 | Configure frontend quality tools | Add formatter, ESLint, typecheck, Vitest, Testing Library, axe helper, and coverage baseline. One accessible sample test passes. | LOS-0201 |
| LOS-0209 | Configure backend quality tools | Add formatting/static analysis, JUnit, AssertJ, Testcontainers, architecture tests, and coverage reporting. Clean build is reproducible. | LOS-0202, LOS-0204 |
| LOS-0210 | Build local full-stack gateway | Add local Caddy/dev proxy or documented equivalent so browser/API behave same-origin under `/life-os`; SPA refresh and API routing do not conflict. | LOS-0201, LOS-0202 |
| LOS-0211 | Define environment validation | Validate required frontend/backend configuration on startup; commit safe `.env.example`; errors name missing keys without printing values. | LOS-0201, LOS-0202 |
| LOS-0212 | Add CI foundation | On feature PR run docs check, format, lint, typecheck/compile, unit/integration tests, build, secret scan. Cache safely; a failing check blocks merge. When a remote exists, bind required checks and protection to `develop`/`master`. | LOS-0004, LOS-0203, LOS-0208, LOS-0209 |
| LOS-0213 | Add API health and problem details | Implement versioned safe error format, correlation ID, liveness/readiness, and restricted actuator configuration. Tests prove no stack trace leaks. | LOS-0202, LOS-0206 |
| LOS-0214 | Add OpenAPI baseline | Generate `/api/v1` spec with server path, security/CSRF notes, standard problems, pagination schema, and CI artifact. Empty baseline validates. | LOS-0213 |
| LOS-0215 | Add test data builders | Create deterministic frontend/backend factories for user/project/task/time objects with timezone controls. No production-like personal data enters fixtures. | LOS-0208, LOS-0209 |
| LOS-0216 | Run engineering foundation gate | Fresh clone starts web/API/DB, nested routes build, tests/CI pass, and docs match commands. Record timings and defects. | LOS-0201–LOS-0215 |
