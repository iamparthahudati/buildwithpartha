# QA acceptance matrix

These are release-level cases in addition to ticket tests. IDs stay stable for test management.

## Identity and privacy

- QA-AUTH-001: New email signs up, receives one verification flow, verifies once, and reaches onboarding; token replay is harmless.
- QA-AUTH-002: Duplicate signup and unknown password-recovery requests return indistinguishable public responses.
- QA-AUTH-003: Login rejects unverified/disabled/invalid users safely and rate limits repeated failures.
- QA-AUTH-004: Session cookie has Secure/HttpOnly/SameSite/path attributes in production; frontend storage has no auth token.
- QA-AUTH-005: Logout and password reset revoke required sessions; back/refresh cannot recover private cached content.
- QA-AUTH-006: User B cannot infer or access any User A resource through ID, nested URL, filter, search, export, file, or activity.
- QA-AUTH-007: Export contains the documented User A data only; delete lifecycle follows grace/purge/backup policy.
- QA-AUTH-008: Account deletion reaches live rows, derived indexes/caches, jobs, optional provider data and device stores; restoring a pre-deletion backup reapplies the completed-deletion ledger before service resumes.
- QA-AUTH-009: DAST and active penetration probes (IDOR, CSRF, session hijacking, password reset replay, malicious file upload, cache disclosure) pass with zero unaccepted findings per [53-APPLICATION-SECURITY-TESTING.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/53-APPLICATION-SECURITY-TESTING.md).

## Navigation, shell, and states

- QA-UX-001: Every protected destination is keyboard reachable, has one main landmark/title, active nav, skip link, and logical focus on route change.
- QA-UX-002: At 320px and 200% zoom, core actions remain usable without page-level horizontal scroll.
- QA-UX-003: First-use, filtered-empty, search-empty, partial error, offline, 429, 5xx, expired-auth, conflict and success states match `12-UX-STATES.md`.
- QA-UX-004: Closing a details drawer returns focus and preserves list filters, page, selection and scroll.
- QA-UX-005: Reduced motion removes nonessential animation; forced colors/high contrast retain state meaning.
- QA-UX-006: Copy follows the vocabulary/tone contracts; validation gives a correction, persistence states never overclaim, destructive actions name consequences, and dates/plurals localize correctly.

## Core execution

- QA-WORK-001: Create project, milestone and task; list/detail metrics agree and survive refresh.
- QA-WORK-002: Archive/complete a project with unfinished tasks follows the explicit chosen action; no task disappears silently.
- QA-WORK-003: Task subtasks update progress exactly once; stale concurrent edit produces conflict rather than overwrite.
- QA-WORK-004: Dependency cycles/self/cross-user edges are rejected; blocked status explains unresolved blockers.
- QA-WORK-005: MIT is unique per local date and clears when completed/deleted.
- QA-WORK-006: Bulk task action reports individual failures while preserving successful changes and selection context.
- QA-WORK-007: Labels rename/delete-replace consistently across linked records and keep accessible color/text.

## Time, focus, and calendar

- QA-TIME-001: Add/move/resize a Time Block; overlap prompts cancel/edit/explicit override and is consistent in Today/Calendar.
- QA-TIME-002: DST nonexistent and repeated local times show an explicit choice/error; stored/displayed instants remain correct.
- QA-TIME-003: Focus start/pause/background-tab/sleep/refresh/resume/complete reports accurate server-authoritative elapsed time once.
- QA-TIME-004: Two tabs cannot create two active focus sessions or double-complete one.
- QA-TIME-005: Day/week/month calendar source click opens the true entity; dense day overflow is keyboard/screen-reader usable.

## Planning and review

- QA-PLAN-001: Sprint scope before/after start and carry-over are logged; completed metrics reconcile with tasks.
- QA-PLAN-002: Weekly plan respects week start/timezone, detects overcapacity/conflicts, and provides keyboard alternatives to drag.
- QA-PLAN-003: Daily/weekly/monthly review draft resumes; finalize snapshots do not change after source records change.
- QA-PLAN-004: Review skip never blocks app access and is presented without guilt language.

## Knowledge, habits, recurrence

- QA-KNOW-001: Note autosave distinguishes Saving/Saved/Queued/Conflict/Failed and never loses both sides of a conflict.
- QA-KNOW-002: Brain-dump conversion retried after lost response creates one destination and links the source.
- QA-KNOW-003: Habit streak handles target counts, pause, late edits, timezone change, DST and no-DST zones deterministically.
- QA-REC-001: Recurring series creates each occurrence once through DST/month-end/leap-day boundaries.
- QA-REC-002: “This”, “this and future”, and “entire series” edits affect only the promised occurrences; skipped/deleted instances do not reappear.

## Search, notification, files, offline

- QA-PLAT-001: Search returns only current-user records, safe highlights, keyboard navigation and no sensitive query/body logs.
- QA-PLAT-002: Notification unread counts remain consistent after read/clear/open in two tabs; quiet hours/preferences are respected.
- QA-PLAT-003: Private attachment cannot be guessed/cached/publicly fetched; invalid/oversize/infected files are rejected/quarantined safely.
- QA-PLAT-004: Offline allowed create shows Queued, replays once with idempotency after reconnect, and becomes Saved only after acknowledgment.
- QA-PLAT-005: Logout/account switch clears private drafts/queued/cache data for the previous user.

## Analytics and operations

- QA-DATA-001: Chart, accessible table, CSV/PDF, Today metric and API agree for the same filters and timezone.
- QA-DATA-002: Empty and missing data show zero/unknown honestly; no fabricated trends or causal claims.
- QA-OPS-001: Fresh production-like DB migrates forward; failed deploy rollback follows runbook without incompatible schema loss.
- QA-OPS-002: Backup restore meets recorded RPO/RTO and restored data passes ownership/relationship checks.
- QA-OPS-003: Cloudflare cache never serves private/auth/API data between users; origin bypass is blocked.
- QA-OPS-004: Mail/job/storage/database failure emits safe logs/metrics/alerts and retries/degrades according to policy.
- QA-PERF-001: Frontend initial bundle ($\le 200\text{ kB}$ entry JS, $\le 50\text{ kB}$ CSS) and 30 route chunks ($\le 100\text{ kB}$) meet budgets with zero Rollup bundle warnings per [54-PERFORMANCE-BUDGETS-AND-BENCHMARKS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/54-PERFORMANCE-BUDGETS-AND-BENCHMARKS.md).
- QA-PERF-002: Real-user metrics evaluate Core Web Vitals targets (LCP $\le 1500\text{ ms}$, INP $\le 100\text{ ms}$, CLS $\le 0.05$, FCP $\le 1000\text{ ms}$, TTFB $\le 400\text{ ms}$).
- QA-PERF-003: Backend API latency SLAs (Tier 1 $\le 100\text{ ms}$, Tier 2 $\le 250\text{ ms}$, Tier 3 $\le 500\text{ ms}$ p95) and large-data volume scalability (50+ tasks, 100+ habit logs) execute under budget.

## Failure and recovery UX

- QA-FAIL-001: Offline mode displays honest disconnected banner and last sync time, gates unsafe remote actions, enqueues mutations with idempotency keys, preserves drafts, and replays on reconnect.
- QA-FAIL-002: Network timeouts (504/aborted requests) retain in-flight form inputs and allow non-blocking retry with the same idempotency key without duplicate creation.
- QA-FAIL-003: 5xx server downtime and unexpected errors return sanitized RFC 7807 problem details with correlation ID (`Reference ID: <id>`) and zero stack trace/internal disclosure in UI.
- QA-FAIL-004: HTTP 429 rate limiting returns `Retry-After` header, communicates cooldown guidance, prevents rapid duplicate clicks, and preserves form inputs.
- QA-FAIL-005: Expired authentication (401) preserves in-progress draft, redirects to login with `returnTo`, restores target destination and draft upon re-auth, and purges previous user cache on account switch.
- QA-FAIL-006: Stale version (409) optimistic concurrency conflict presents clear resolution choices (keep changes, reload server) and never silently overwrites local edits.
- QA-FAIL-007: Background and asynchronous job failures display honest failure status badges, error summaries, and retry actions without blocking application navigation.
- QA-FAIL-008: Composite Today dashboard isolates single widget failure with inline retryable error state while surrounding healthy widgets and shell remain fully interactive.

## Data privacy, export, and deletion lifecycle

- QA-PRIV-001: Data export ZIP archive contains all 19 domain models (`manifest.json`, `account.json`, `terms.json`, `preferences.json`, `tasks.json`, `projects.json`, `labels.json`, `timeblocks.json`, `focus_sessions.json`, `sprints.json`, `weekly_plans.json`, `reviews.json`, `goals.json`, `notes.json`, `braindump.json`, `habits.json`, `notifications.json`, `activity.json`, `comments.json`, `attachments.json`, `README.md`) and conforms to `data-export.schema.json`.
- QA-PRIV-002: Export archives strictly exclude Argon2 password hashes, session tokens, verification/reset hashes, and CSRF secrets.
- QA-PRIV-003: Multi-tenant export isolation guarantees zero foreign user records are captured in any export archive file.
- QA-PRIV-004: Account deletion request requires re-authentication, enters 30-day grace period, and immediately revokes all active sessions across devices (401 Unauthorized).
- QA-PRIV-005: Deletion cancellation token restores account status to ACTIVE within the 30-day grace period.
- QA-PRIV-006: Grace period expiry triggers automated purge sweep, deleting primary user row and cascading through all foreign-keyed child entities.
- QA-PRIV-007: Account deletion retains only minimal non-PII audit record (`account_deletion_requests` with `PURGED` status) per R6/R8 retention policy.
- QA-PRIV-008: Automated data privacy audit script (`validate-data-privacy.sh`) passes in CI.

## Backup restoration rehearsal

- QA-BKP-001: Automated restoration rehearsal decrypts AES-256 encrypted production-like database backup with SHA-256 checksum verification.
- QA-BKP-002: Restored PostgreSQL database executes Flyway migration validation successfully with zero pending migrations and valid schema checksums.
- QA-BKP-003: Restored database passes 100% data integrity and relational consistency checks across sampled domain entities (Users, Tasks, Projects, TimeBlocks, Habits, Notes, Reviews, Goals, Focus Sessions, Notifications, Audit Ledger).
- QA-BKP-004: Restored application file archive correctly extracts attachments and user exports with relational mapping and orphan reconciliation.
- QA-BKP-005: Restoration rehearsal execution meets the RTO target ($< 15\text{ minutes}$ / $900\text{ s}$) and satisfies RPO target ($24\text{ hours}$).
- QA-BKP-006: Post-restoration deletion-ledger replay successfully identifies and purges accounts deleted between backup snapshot timestamp and restoration time.
- QA-BKP-007: Safe teardown and destruction policy completely destroys temporary decrypted dumps, isolated database schemas/instances, and test file fixtures without data leakage.
- QA-BKP-008: Automated verification audit script (`validate-backup-restoration-rehearsal.sh`) and rehearsal script (`run-backup-restoration-rehearsal.sh`) pass cleanly with `--dry-run`.

## Launch QA report

- QA-REP-001: Consolidated launch QA report ([57-LAUNCH-QA-REPORT.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/57-LAUNCH-QA-REPORT.md)) compiles test execution results, a11y sweeps, browser matrices, security evaluations, performance benchmarks, and restore rehearsal metrics across Epics 01 through 16.
- QA-REP-002: Defect registry records zero open P0 (Blocker) and zero open P1 (Critical) defects, with all discovered pre-launch findings triaged and resolved.
- QA-REP-003: Formal accepted risks registry explicitly documents non-blocking edge cases (yearly recurrence gap, half-hour display rounding, timezone change non-retroactivity, single-node recovery interval) with business justifications, mitigations, review dates, and assigned owners.
- QA-REP-004: All 7 critical Playwright user journeys pass 100% on both Desktop and Mobile Chromium viewports.
- QA-REP-005: Cross-user authorization matrix confirms 100% row-level tenant isolation and 404/empty indistinguishability across all 19 domain entity aggregates.
- QA-REP-006: Frontend accessibility audit satisfies WCAG 2.2 AA standards with zero critical/serious violations across public and authenticated routes.
- QA-REP-007: Security header policies, dependency vulnerability scans, and dynamic application security testing (DAST) pass with zero unaccepted risks.
- QA-REP-008: Automated Launch QA report audit script (`validate-launch-qa-report.sh`) passes cleanly in CI/dry-run mode with an explicit GO decision sign-off.
