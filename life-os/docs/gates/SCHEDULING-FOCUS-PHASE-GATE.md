# Scheduling and Focus Phase Gate (Epic 09)

- Date: 2026-08-25
- Status: PASSED
- Scope: Epic 09 — Time Blocks, Calendar, and Focus (LOS-0901 through LOS-0918)

## Executive summary

The Scheduling and Focus phase gate passes. The canonical workflow from a Task scheduling handoff through conflict detection and explicit override, Time Block persistence, Focus Session recovery and completion, and Calendar/Today/daily-report refresh is covered by the repository's backend and frontend gates. DST boundaries, concurrent tabs, ownership isolation, accessibility, and responsive behavior also pass.

The gate found and closed four defects before sign-off:

- Task Details supplied `taskId` to the Time Blocks route, but the route did not open the create form with that Task selected.
- The overlap API and conflict UI existed independently, but create/edit did not run the preflight and explicit-override loop in the integrated route.
- A failed Time Block query omitted the controlled `blocks` prop, causing catalog fixtures to appear behind a real API error.
- Time Summary and Upcoming Time Block breakpoints followed the browser viewport instead of their narrow sidebar container, causing the overlap shown during LOS-0918 review.

The 404s captured during the gate came from a local backend process started on 2026-08-23, before the Time Block/Focus endpoints and migrations existed. Restarting the current application applied the already-committed V15–V18 migrations and restored both endpoint families; no source migration was required by LOS-0918.

## Prerequisite status

LOS-0901 through LOS-0917 are Done and have completed handoffs in `docs/handoffs/`. Their canonical schema, API, component, screen, Calendar, Focus Session, preference, and daily report contracts remain the inputs to this gate.

## Verification evidence

### Backend

- Working directory: `apps/api`
- Runtime: Eclipse Temurin JDK 21.0.11
- Command: `./gradlew check --rerun-tasks`
- Result: `BUILD SUCCESSFUL`; all 11 gate tasks executed
- Tests: 759, with 0 failures, 0 errors, and 0 skipped
- JaCoCo: 96.08% lines (7,964/8,289) and 80.31% branches (1,521/1,894)
- Passing checks include Java compilation, Spotless, Checkstyle, JUnit/API/integration/schema tests, OpenAPI generation, architecture rules, and JaCoCo verification.

### Frontend

- Working directory: `apps/web`
- Runtime: Node.js 24.16.0 and npm 11.13.0
- Command: `npm test`
- Result: passed
- Vitest: 237 files and 1,954 tests passed
- V8 coverage: 84.61% statements, 81.32% branches, 80.13% functions, and 85.92% lines
- Prettier, zero-warning ESLint, strict TypeScript, module boundaries, design-token enforcement, Vitest coverage, the test production build, and 35 repository Node assertions all passed.
- Focused LOS-0918 suites cover the Task scheduling deep link, conflict preflight/override, no-fixture error behavior, Time Block cache invalidation, Focus Session reconciliation/two-consumer completion, Time Block form DST behavior, screen interactions, and axe audits.

### Rendered responsive check

- The development component catalog was checked at its minimum and large specimens after the fixes.
- Minimum specimen: Time Blocks root `clientWidth` and `scrollWidth` both 380px; every Upcoming row `clientWidth` and `scrollWidth` both 378px; metrics and chart sections each resolved to one 380px column.
- Large specimen: root `clientWidth` and `scrollWidth` both 934px; sidebar `clientWidth` and `scrollWidth` both 380px; every Upcoming row remained 378px wide with no horizontal overflow; metrics and chart sections remained one sidebar-sized column.

## Gate coverage

| Contract | Evidence | Result |
| --- | --- | --- |
| Schedule a Task | Task Details' canonical `taskId` handoff now opens Create Time Block with that owner-scoped Task selected; route coverage proves the deep link. | PASSED |
| Detect and override conflict | Integrated route preflights create/edit, keeps the form open with named conflicts, requires the explicit override checkbox, and still relies on the backend's race-safe 409 enforcement. Controller/database tests cover detection and override. | PASSED |
| Focus through refresh and two tabs | Active-session query recovery, BroadcastChannel reconciliation, version-conflict reload, server-derived clocks, concurrent-start protection, and exactly-once completion across two consumers pass. | PASSED |
| Complete and refresh projections | Time Block and Focus completion tests pass. Mutation tests verify invalidation of Time Blocks, Tasks where linked, Calendar, Today, and `reports/time` as applicable. | PASSED |
| Calendar, Today, and report truth | Calendar excludes other Accounts and returns canonical sources; Today resolves the Account timezone; daily reports prove owner-scoped planned-versus-actual values, labelled denominator, and zero-data behavior. | PASSED |
| DST and local dates | Time Block domain/form tests cover DST transitions, nonexistent and ambiguous local times; Calendar and daily-report tests cover timezone date bounds including 23-hour/25-hour behavior. | PASSED |
| Ownership and concurrency | Time Block integration proves cross-user query/view/mutation isolation and optimistic locking; Focus and Calendar controller suites hide cross-user records and prevent concurrent active sessions. | PASSED |
| Accessibility and responsive behavior | Full frontend axe/keyboard/reduced-motion/zoom/pointer gates pass. Container-width browser checks prove the Time Summary and Upcoming rows no longer overflow at the reproduced narrow-sidebar width. | PASSED |

## Defects and changes

- Gate-blocking defects found: four.
- Gate-blocking defects remaining: none.
- Product code changes: integrated Task scheduling and conflict resolution; honest API-error rendering; container-responsive summary and Upcoming rows.
- Database/API/privacy/configuration/deployment contract changes: none.

## Phase gate sign-off

Epic 09 — Time Blocks, Calendar, and Focus is closed and approved. The next recommended ticket is LOS-1001, Model and implement Sprints API. No merge to `master` or production deployment is authorized by this gate.
