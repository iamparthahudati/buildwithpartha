# Shell and Today foundation gate

- Ticket: LOS-0616
- Date: 2026-08-20
- Status: Pass
- Scope: LOS-0601 through LOS-0615

## Gate conclusion

The private application shell and foundational Today experience are ready for the next domain epic. A verified Account receives the correct local-date projection for its confirmed IANA timezone and truthful modular data states. Anonymous visitors and Accounts outside the `ACTIVE` lifecycle state cannot use the Today endpoint. Navigation, the shell-owned Quick Add dialog, the idle Focus Session surface, and the complete Today state set meet the current automated accessibility and responsive contracts.

This is intentionally a foundation gate. The default backend providers remain zero-safe until their canonical domains ship; LOS-1415 closes full real-data Today aggregation. The frontend contract is already proven against populated future-provider fixtures without a `TodayScreen` rewrite.

## Acceptance evidence

| Acceptance area | Evidence | Result |
| --- | --- | --- |
| Anonymous access blocked | `ShellTodayFoundationGateIntegrationTests.anonymousVisitorsCannotReadToday`; frontend `RequireAuth` and `AppRoutes` signed-out coverage | Pass |
| Unverified access blocked | Gate test issues an otherwise-active session for an `UNVERIFIED` Account and receives `401 AUTHENTICATION_REQUIRED`; `SessionAuthenticationFilter` now requires an `ACTIVE` owner | Pass |
| Verified timezone and local date | Gate test derives the expected local date from the response `generatedAt` instant in `Asia/Kolkata` and compares it exactly with `localDate` | Pass |
| Private cache policy | Gate test requires `private` and `no-store`; controller now emits `private, no-store, max-age=0, must-revalidate` exactly | Pass |
| Honest foundation empty data | Gate test asserts empty Tasks, schedule, Focus, Projects, Reviews, Brain Dump and Metrics without production sample titles | Pass |
| Available and partial data | `todayViewModel.test.ts`, `TodayRoute.test.tsx`, and component suites cover populated future-provider data, isolated provider errors, loading, retry and offline freshness | Pass |
| Protected shell and navigation | `AppRoutes.test.tsx`, `AppShell.test.tsx`, `Sidebar.test.tsx`, and `TopBar.test.tsx` cover shell-only mounting, landmarks, skip link, active navigation, route focus/announcement and mobile drawers | Pass |
| Quick Add shell | `QuickAddDialog.test.tsx`, `AppShell.test.tsx`, and `TodayRoute.test.tsx` prove one shell-owned dialog opens from global and Today actions while preserving feature-aware creation type | Pass |
| Focus foundation | `FocusMiniPlayer.test.tsx` covers idle, restored, running, paused, completed, offline and narrow-screen behavior with transition-only announcements | Pass |
| Accessibility and responsive states | The full frontend suite includes axe checks across Today and shell states, 320px/tablet/desktop catalog contracts, 200%-zoom token scaling, 44px targets, reduced motion, forced colors and high contrast | Pass |

## Defects closed by the gate

1. `SessionAuthenticationFilter` accepted any active session row without checking whether the owning Account was still `ACTIVE`. The filter now rejects sessions tied to unverified, suspended, pending-deletion, deleted or missing Accounts. Existing security-controller fixtures were corrected to create genuinely verified Accounts.
2. `TodayController` documented a private no-store policy but Spring's cache builder emitted only `no-store, must-revalidate`. The response now sends the documented private, zero-age, non-cacheable policy explicitly.
3. The stacked backend branch contained formatter drift. The locked Spotless formatter was applied mechanically and the real global formatting check now runs cleanly.

## Validation record

- Frontend `npm test`: 165 Vitest files and 1,503 tests passed; formatting, lint, strict typecheck, module boundaries, token validation, coverage, production test build and 35 Node assertions passed.
- Backend `./gradlew check`: 425 tests, Spotless, Checkstyle, architecture rules, JaCoCo reporting and coverage verification passed.
- Documentation validator: all local links, ticket references and freshness checks passed.
- Prerequisite live-browser evidence remains recorded in LOS-0601–LOS-0615 handoffs, including the composed Today catalog at 320px, tablet and desktop. A fresh in-app-browser pass was unavailable in this session; no new visual implementation was introduced by LOS-0616.

## Deferred closure

- LOS-1415 owns real providers for the full Today aggregation. The foundation continues to show typed `EMPTY` states instead of invented records until those domains exist.
- Canonical Task/MIT, Time Block/Focus and Brain Dump mutations remain owned by their later domain tickets; unavailable actions stay disabled or preserve input honestly.
