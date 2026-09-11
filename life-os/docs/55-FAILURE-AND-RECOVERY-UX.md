# Failure and Recovery UX Specification (LOS-1511)

## Purpose & Scope

In a personal operating system managing vital daily tasks, schedules, habits, notes, and strategic goals, failures—whether network drops, server errors, timeouts, rate limits, session expiry, concurrent update collisions, asynchronous background job crashes, or partial component breakdowns—must never cause data loss, phantom state changes, silent degradation, or confusing blank screens.

LifeOS adheres strictly to the canonical UX error formula:
$$\text{State Presentation} = \text{What Happened} + \text{What Was Preserved/Current} + \text{Next Action}$$

This document specifies the technical architecture, state transitions, honest reporting contracts, non-destructive data retention guarantees, and automated recovery paths across the 8 core failure dimensions defined in the QA strategy.

---

## The 8 Failure & Recovery Dimensions

```
                                  ┌─────────────────────────────────────────┐
                                  │       LifeOS Failure & Recovery UX      │
                                  └────────────────────┬────────────────────┘
                                                       │
         ┌──────────────────┬──────────────────┬───────┴──────────┬──────────────────┬──────────────────┐
         │                  │                  │                  │                  │                  │
   ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐
   │  Mode 1   │      │  Mode 2   │      │  Mode 3   │      │  Mode 4   │      │  Mode 5   │      │  Mode 6   │
   │  Offline  │      │ Timeouts  │      │  5xx /    │      │ HTTP 429  │      │  Expired  │      │   Stale   │
   │ & Network │      │ & Dropped │      │ Service   │      │   Rate    │      │   Auth    │      │  Version  │
   │   Loss    │      │ Responses │      │ Downtime  │      │ Limiting  │      │  Session  │      │  Conflict │
   └───────────┘      └───────────┘      └───────────┘      └───────────┘      └───────────┘      └───────────┘
                                                       │
                                        ┌──────────────┴──────────────┐
                                        │                             │
                                  ┌─────▼─────┐                 ┌─────▼─────┐
                                  │  Mode 7   │                 │  Mode 8   │
                                  │ Async Job │                 │  Partial  │
                                  │  Failure  │                 │  Widget   │
                                  │ Reporting │                 │ Isolation │
                                  └───────────┘                 └───────────┘
```

---

### Mode 1: Offline Mode & Network Loss

#### Trigger
- Browser `navigator.onLine === false` event.
- Network fetch throws `TypeError: Failed to fetch` or `NetworkError`.

#### UX Contract & Guarantees
1. **Persistent Visual Indicator**: Top-level offline banner (`OfflineBanner.tsx` / `OfflineQueueBadge.tsx`) informs the user of disconnected status and displays the timestamp of the last confirmed sync.
2. **Action Gating**: Read access across previously cached data is fully permitted. Unsafe remote-only actions (e.g. permanent account deletion, password reset) are gracefully disabled with informative tooltips.
3. **Offline Mutation Queue**: Creates and updates for core capture items (Brain Dump captures, Task creations via Quick Add, Note drafts) are accepted locally and stored in encrypted, user-namespaced storage (`@features/offline-mutation-queue`, `@features/offline-drafts`) with status marked honestly as `Queued` (never falsely marked as `Saved`).
4. **Idempotency Guarantee**: Every queued item is stamped with an immutable client ID and a UUID v4 `Idempotency-Key` header (8–64 safe ASCII characters).
5. **Reconnection Auto-Sync**: Upon `window.addEventListener("online")`, the mutation queue is flushed sequentially in FIFO order. Once the server confirms with HTTP 201/200, the UI transitions status from `Queued` $\to$ `Saved`.

---

### Mode 2: Network Timeouts & Dropped Packets

#### Trigger
- Client fetch timeout abort (default 10s timeout ceiling).
- Reverse proxy or gateway HTTP 504 Gateway Timeout / 408 Request Timeout.

#### UX Contract & Guarantees
1. **Zero Input Loss**: All user inputs in active forms (`TaskForm`, `ProjectForm`, `NoteForm`, `HabitForm`, `ReviewForm`) are retained in the DOM and session draft buffer. Form fields are never wiped or reset on timeout.
2. **Non-Blocking Retry**: An actionable error alert appears with an explicit "Try again" / "Retry" button.
3. **Idempotency Header Replay**: Re-submitting the form uses the exact same `Idempotency-Key` header generated on the initial submission attempt. If the previous attempt reached the database before the timeout dropped the connection, the backend safely returns the cached result without duplicate record creation.

---

### Mode 3: Server 5xx Errors & Service Downtime

#### Trigger
- Backend HTTP 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable.

#### UX Contract & Guarantees
1. **RFC 7807 Problem Details Sanitization**: The API returns standard `application/problem+json` envelopes. Internal Java class names, SQL queries, stack traces, and database connection strings are never exposed.
2. **Safe Correlation ID Display**: The error surface extracts the `X-Correlation-ID` header and presents:
   $$\text{Reference ID: }\texttt{0edeaab6-e979-490f-a290-5681f4ed936f}$$
   This identifier enables unambiguous log correlation for support while preserving zero internal information disclosure.
3. **Error Boundary Containment**: React Error Boundaries (`ErrorBoundary.tsx`) capture uncaught render errors at the route or widget level, preventing blank white screens.
4. **Page & Region Scopes**: Page-level failures provide "Reload page" or "Go back"; region-level failures provide an inline retry without disturbing adjacent widgets.

---

### Mode 4: HTTP 429 Rate Limiting

#### Trigger
- Backend rate limiter triggers on auth endpoints (5 req / 15 min), search queries (30 req / min), exports (10 req / min), or write bursts (60 req / min).

#### UX Contract & Guarantees
1. **Retry-After Header**: Responses include `Retry-After: <seconds>` indicating cooldown duration.
2. **Honest Cooldown Feedback**: The UI informs the user that requests were too frequent and provides a clear countdown or "Try again in a few moments" guidance without accusatory or punishing copy.
3. **Multi-Click Prevention**: Form submit buttons automatically disable upon submission, preventing rapid duplicate clicking. Form content remains fully preserved.

---

### Mode 5: Expired Authentication & Session Revocation

#### Trigger
- API returns HTTP 401 Unauthorized due to session timeout, server token revocation, or all-device logout.

#### UX Contract & Guarantees
1. **Draft Preservation**: Any in-flight form draft is automatically preserved in session-scoped `localStorage` under `lifeos_draft_<userId>_<entityType>`.
2. **Return-To Navigation**: The user is redirected to `/life-os/app/login?returnTo=<encodedPath>`.
3. **Seamless Post-Auth Recovery**: Upon successful re-authentication, the user is navigated directly back to `returnTo` with their preserved form draft restored.
4. **Strict Account Boundary Purge**: If a different user signs in on the same browser, all drafts, cached React Query states, and mutation queues belonging to the previous user are immediately destroyed.

---

### Mode 6: Stale Version & Optimistic Concurrency Conflicts

#### Trigger
- Backend HTTP 409 Conflict with error code `OPTIMISTIC_LOCK_CONFLICT` when updating an entity whose database `@Version` exceeds the request version.

#### UX Contract & Guarantees
1. **Never Silent Overwrite**: The system refuses to overwrite newer server data with stale client edits.
2. **Conflict Choice Dialog**: Presents clear options:
   - *Keep my changes*: Overwrites server with latest client version increment.
   - *Load server version*: Replaces local editor with fresh server state.
   - *Compare & Merge*: Displays local and server text side-by-side.
3. **Local Text Preservation**: The user's typed changes are never discarded without explicit confirmation.

---

### Mode 7: Background & Asynchronous Job Failure

#### Trigger
- Long-running report generation, bulk data export, or recurring task generation jobs transition to `FAILED` status.

#### UX Contract & Guarantees
1. **Explicit Status Display**: Job tracking surfaces show a `Failed` badge with an honest explanation (e.g. "Data export could not complete").
2. **Actionable Recovery**: Offers an immediate "Retry Export" or "Request New Export" action.
3. **Non-Blocking Execution**: Asynchronous job failures do not block regular navigation or CRUD operations on the rest of the system.

---

### Mode 8: Partial Widget Failure & Section-Level Degradation

#### Trigger
- Composite dashboard (`/life-os/app/today`) encounters an error in one provider (e.g. habit aggregation throws an error while task, sprint, and timeline queries succeed).

#### UX Contract & Guarantees
1. **Widget Isolation**: The failing widget is isolated inside an inline `ErrorState` (`scope="region"`) or `Alert` component with a dedicated "Retry" button.
2. **Surrounding Health**: All remaining widgets (MIT, Today Tasks, Active Sprint, Timeline, Metrics) continue rendering and functioning normally.
3. **No Page-Level Crash**: A single section failure never crashes the full application shell or masks unrelated data.

---

## State Transition Matrix

| Failure Mode | Initial State | Failure Trigger | UX Presentation | Preserved Artifact | Recovery Action | Target State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Offline** | Online / Idle | Connection lost | Top Offline Banner + Queued badge | Local storage draft & mutation queue | Auto-sync on reconnect / Sync Now | Synced / Online |
| **Timeout** | Form Editing | Submit $\to$ 504 / Drop | Inline Danger Alert + Retry | Complete form inputs & Idempotency Key | Click "Try again" (same Idempotency Key) | Created / 200 OK |
| **5xx Error** | Loading / Fetch | 500 / 502 / 503 | Page/Region `ErrorState` + Ref ID | Unaffected route components | Click "Try again" / "Reload page" | Healthy View |
| **429 Rate Limit** | Rapid Action | 429 Too Many Requests | Rate limit banner with cooldown | Form values & query inputs | Wait for Retry-After $\to$ Retry | Success |
| **401 Expired Auth** | Active Session | Session revoked | Redirect to `/login?returnTo=...` | In-progress draft in local cache | Sign in with valid credentials | Restored Route & Draft |
| **409 Conflict** | Form Editing | Stale version save | Conflict resolution modal | Unsaved local changes | Choose "Keep my changes" or "Reload" | Resolved State |
| **Job Failure** | Async Processing | Job status `FAILED` | "Job Failed" status badge & notice | Original job parameter definition | Click "Retry job" | Job Queued / Finished |
| **Partial Widget** | Today Dashboard | 1 widget fetch fails | Isolated widget `Alert` with Retry | Other 9 healthy widgets & data | Click widget "Retry" button | Healthy Widget |

---

## Automated Verification & Test Harness

Automated verification of failure and recovery UX is enforced across multiple tiers:
1. **Playwright E2E Test Suite** (`apps/web/e2e/failure-recovery/failure-recovery-ux.spec.ts`):
   - Injects mock network faults (offline status, 504 timeout, 500 error, 429 rate limit, 401 unauthorized, 409 conflict, partial widget failure) and validates UI presentation and recovery flows.
2. **Backend Resilience Integration Tests** (`FailureRecoveryUxIntegrationTests.java`):
   - Asserts RFC 7807 problem details responses, correlation ID echo, 429 `Retry-After`, 409 conflict detection, and idempotency replay.
3. **Automated Audit Script** (`life-os/scripts/validate-failure-and-recovery-ux.sh`):
   - Validates documentation compliance, test suite execution, and QA acceptance matrix alignment.
