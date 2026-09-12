# QA and test strategy

## Automated layers

- Frontend unit/component: Vitest, Testing Library, user-event, axe checks for components.
- Backend unit: JUnit 5 for domain/application rules.
- Backend integration: Spring Boot + Testcontainers PostgreSQL; Flyway runs exactly as production.
- Contract: OpenAPI/schema compatibility and frontend API boundary validation.
- End to end: Playwright against the composed stack for critical journeys.
- Non-functional: dynamic application security testing (OWASP ZAP / penetration testing), dependency/secret/container scans, performance budgets, accessibility automation, backup/restore scripts.

The frontend unit baseline enforces 80% statements, branches, functions and lines through Vitest's V8 provider. Shared Testing Library render/user-event support and the axe helper live under `apps/web/src/test`. JSDOM cannot calculate layout-dependent color contrast, so that axe rule is disabled only in unit tests and must be covered by later browser automation plus manual WCAG 2.2 AA review.

Frontend and backend tests share the same deterministic fixture values through their native test-support boundaries: fixed UUIDs, fixed UTC instants, the reserved `example.test` identity domain, approved neutral Project/Task copy and canonical stored statuses. Builders return immutable values, isolate overrides from defaults and derive local dates from explicit valid IANA timezones. Boundary tests cover the same instant resolving to different local dates; production data is never copied into fixtures.

The backend baseline uses JUnit, AssertJ and ArchUnit, with PostgreSQL Testcontainers support for integration tests. `./gradlew check` also enforces deterministic Spotless formatting, zero-error/zero-warning Checkstyle analysis, and JaCoCo line and branch coverage at a minimum of 80%. XML and HTML coverage reports are generated for CI and local review. The shared test container definition pins the same PostgreSQL image as local Compose; tests that start it require a Docker-compatible runtime.

The local gateway contract starts disposable Vite and mock-upstream servers. It proves `/life-os/api/*` paths and query strings are forwarded unchanged, API status/body responses are not replaced by HTML, nested `/life-os/*` UI routes receive the SPA document, and similarly prefixed UI paths do not cross the API boundary.

Environment tests exercise successful startup parsing plus missing, blank, malformed and sensitive-looking values. They assert that failures name every affected key without reproducing any value. Frontend test mode and the backend `test` profile supply deterministic public/non-secret values so the quality gates remain self-contained.

The API safety suite proves that expected, validation, malformed, missing-resource, authentication, authorization and unexpected failures share the versioned `application/problem+json` contract. Assertions reject diagnostic messages, causes, exception classes, stack traces, request-body values and unsafe caller correlation IDs. Filter tests cover safe ID reuse, replacement and response/request-context propagation. Health tests prove that only liveness/readiness are public, database readiness contributes without component disclosure, and actuator discovery, info and health-root access remain restricted.

The OpenAPI test requests the generated JSON through the authenticated runtime endpoint, validates OpenAPI 3.1 metadata, the empty-first paths contract, server path, session/CSRF schemes, standard Problem Details responses and pagination schema, then writes the exact checked response to `build/openapi/life-os-openapi.json`. The hosted backend job fails when the file is absent and retains it as the `life-os-openapi` artifact for 14 days.

The performance budgets and benchmarks specification ([54-PERFORMANCE-BUDGETS-AND-BENCHMARKS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/54-PERFORMANCE-BUDGETS-AND-BENCHMARKS.md)) enforces frontend bundle limits (initial JS $\le 200\text{ kB}$, route chunks $\le 100\text{ kB}$, CSS $\le 50\text{ kB}$), Core Web Vitals targets (LCP $\le 1500\text{ ms}$, INP $\le 100\text{ ms}$, CLS $\le 0.05$, FCP $\le 1000\text{ ms}$, TTFB $\le 400\text{ ms}$), API latency SLAs across 3 tiers (fast/health $\le 100\text{ ms}$, CRUD $\le 250\text{ ms}$, aggregations $\le 500\text{ ms}$ p95), database single query budgets ($\le 50\text{ ms}$), container resource boundaries, and 50+ task / 100+ habit entry volume scalability tests. Automated checks run in `bundle-budgets.test.mjs`, `performance.test.ts`, and `PerformanceBudgetsIntegrationTests.java`.

The failure and recovery UX specification ([55-FAILURE-AND-RECOVERY-UX.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/55-FAILURE-AND-RECOVERY-UX.md)) validates honest error reporting, zero data loss, non-destructive recovery, and graceful degradation across 8 core failure modes: offline mode & network disconnection, network timeouts (504/aborted requests), 5xx server downtime with safe correlation ID propagation, HTTP 429 rate limiting with `Retry-After` headers, expired session authentication recovery with `returnTo` preserved routing, 409 optimistic locking concurrency conflict handling, asynchronous background job failure visibility, and partial composite widget isolation on the Today dashboard. Automated verification runs in Playwright E2E suite `failure-recovery-ux.spec.ts` and backend integration suite `FailureRecoveryUxIntegrationTests.java`.

The data privacy, export portability, and deletion lifecycle specification ([31-PRIVACY-DATA-LIFECYCLE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md)) validates complete export coverage across all 19 domain models (`manifest.json`, `account.json`, `terms.json`, `preferences.json`, `tasks.json`, `projects.json`, `labels.json`, `timeblocks.json`, `focus_sessions.json`, `sprints.json`, `weekly_plans.json`, `reviews.json`, `goals.json`, `notes.json`, `braindump.json`, `habits.json`, `notifications.json`, `activity.json`, `comments.json`, `attachments.json`, `README.md`), strict exclusion of Argon2 password hashes and authentication tokens, cross-user tenant isolation in export streams, 30-day deletion grace period state machine, immediate multi-device session revocation, uncancelled deletion cascade purge, and minimal non-PII audit ledger retention. Automated verification runs in `DataPrivacyVerificationIntegrationTests.java` and `validate-data-privacy.sh`.

The backup restoration rehearsal specification ([56-BACKUP-RESTORATION-REHEARSAL.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/56-BACKUP-RESTORATION-REHEARSAL.md)) validates complete disaster recovery readiness, AES-256 decryption integrity, Flyway schema migration compliance, 100% data fidelity across all 19 domain entities, RPO ($\le 24\text{ hours}$) and RTO ($< 15\text{ minutes}$) SLA thresholds, post-restoration deletion-ledger replay execution, and safe cryptographic teardown. Automated verification runs in `BackupRestorationRehearsalIntegrationTests.java`, `run-backup-restoration-rehearsal.sh`, and `validate-backup-restoration-rehearsal.sh`.

The consolidated launch QA report ([57-LAUNCH-QA-REPORT.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/57-LAUNCH-QA-REPORT.md)) consolidates automated and manual verification evidence, defect resolution metrics, accepted risk registers, cross-browser and accessibility audits, threat modeling, security header enforcement, vulnerability scans, performance benchmarks, and backup restoration rehearsal metrics into an explicit Go/No-Go release gate decision. Automated audit verification runs in `validate-launch-qa-report.sh`.

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

`life-os/scripts/run-foundation-gate.sh` is the reproducible Epic 02 checkout gate. It validates documentation/policy, performs a locked frontend install and complete test/build, forces an uncached backend build, reruns Flyway on clean/existing disposable PostgreSQL state, then starts the database, production API JAR and built web preview to verify readiness and nested SPA routing. It prints coarse per-step timings without telemetry or private data.
