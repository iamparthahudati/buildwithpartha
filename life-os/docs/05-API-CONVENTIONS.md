# API conventions

Base path: `/life-os/api/v1`.

Resource and field names follow the [LifeOS product vocabulary](./29-PRODUCT-VOCABULARY.md). API contracts use canonical code terms even when the UI destination is an experience name such as Week Planner or Focus Mode.

## Resources

Use plural nouns: `/projects`, `/tasks`, `/time-blocks`, `/focus-sessions`, `/sprints`, `/weekly-plans`, `/goals`, `/notes`, `/brain-dump-items`, `/habits`, `/reviews`, `/labels`, `/notifications`, `/reports`.

Strongly parent-owned resources use nested collections where the parent identity is required, for example `/tasks/{taskId}/subtasks`, `/projects/{projectId}/milestones`, `/goals/{goalId}/check-ins` and `/habits/{habitId}/entries`.

Authentication endpoints: `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/session`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/forgot-password`, `/auth/reset-password`.

## OpenAPI contract

The authenticated OpenAPI 3.1 JSON document is available at `/life-os/api/v1/openapi`. Swagger UI is disabled. Until product controllers are introduced, a valid baseline intentionally contains an empty `paths` object and these reusable components:

- the relative same-origin server `/life-os/api/v1`;
- `sessionCookie`, an opaque HttpOnly `lifeos_session` API-key cookie used by browser requests;
- `csrfToken`, the `X-CSRF-TOKEN` header required with the session for state-changing requests;
- `Problem` and `FieldProblem` schemas matching the safe failure contract below;
- reusable `BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, and `InternalError` responses using `application/problem+json`;
- `PageResponse`, the zero-based envelope with `items`, `page`, `size`, `totalItems`, and `totalPages`.

Every later controller ticket must annotate or customize its operations without redefining these shared components. The backend gate validates the document and writes `build/openapi/life-os-openapi.json`; CI publishes that exact validated file as the `life-os-openapi` artifact for contract review.

## Request and response rules

- JSON uses camelCase. IDs are UUID strings. Date-only values use `YYYY-MM-DD`; instants use RFC 3339 UTC.
- Create returns `201` with the resource and `Location`. Update returns `200`; delete/restore returns a small result body where the UI needs it.
- Pagination uses a zero-based `page`, positive `size`, and stable `sort`; immutable `PageResponse` values return `items`, `page`, `size`, `totalItems`, `totalPages`.
- Filters are explicit query parameters and documented in OpenAPI.
- Expected backend failures carry a stable upper-snake-case `ErrorCode`; exception messages are never returned directly. LOS-0213 maps these codes to RFC Problem Details with `type`, `title`, `status`, `detail`, `instance`, `code`, `correlationId`, and optional field `errors`.
- Use `If-Match`/version or an equivalent explicit version field for collision-sensitive updates.
- Never expose entity classes directly from controllers; use request/response records.

### Task bulk actions

`POST /tasks/bulk-actions` applies one online-only mutation to an ordered selection of 1–100 unique task IDs. Supported actions are `STATUS`, `PRIORITY`, `PROJECT`, `ADD_LABEL`, `REMOVE_LABEL`, `SCHEDULE`, `CLEAR_SCHEDULE`, and `ARCHIVE`. `SCHEDULE` sets the Task `dueAt` instant; linking Tasks to Time Blocks remains owned by the later scheduling API.

The request is rejected as a normal `400` Problem when the selection or action parameters are structurally invalid. Once accepted, each Task runs in an independent transaction and the endpoint returns `200` with `requested`, `succeeded`, `failed`, and an ordered `results` entry for every requested ID. A result is either `SUCCEEDED` with the current Task representation or `FAILED` with only a safe stable error code. Missing and cross-user Task IDs are indistinguishable as `RESOURCE_NOT_FOUND`; Project and Label references are re-authorized server-side.

Bulk actions are retry-safe: already-applied item states are no-ops and retain their version, while failed IDs can be resubmitted without duplicating successful mutations. Concurrent writes still use the Task entity version and surface `CONCURRENCY_CONFLICT` for the affected item rather than rolling back unrelated successes.

### Task detail aggregate

`GET /tasks/{id}/detail` bootstraps Task Details with the canonical Task metadata and ordered Subtasks, bounded blocker/dependent projections, related-section counts, and a top-level `version`. The top-level version is the same optimistic-concurrency value as `task.version` and must be sent in later Task mutations; clients must replace the aggregate after a successful mutation instead of merging a second copy of Task state.

The response counts linked Time Blocks, Focus Sessions, Comments, Attachments, and Activity Events without embedding those independently paginated resources. Counts are zero while their canonical persistence capability is unavailable. Missing, deleted, and cross-user Task IDs are indistinguishable as `404 RESOURCE_NOT_FOUND`. Dependency projection queries remain fixed in number as edge counts grow, and every relationship projection is scoped to the authenticated user.

### Task and Project comments

Comments are strongly parent-owned resources at `/tasks/{taskId}/comments` and `/projects/{projectId}/comments`. Each collection supports bounded newest-first `GET` pagination (`page` defaults to 0; `size` defaults to 20 and is limited to 1–100) and authenticated, CSRF-protected `POST`. Individual nested resources support `GET`, optimistic `PUT` with a required `version` body field, and optimistic `DELETE` with the current non-negative version in `If-Match` (plain or quoted integer). Create returns `201` plus the canonical resource and a `/life-os/api/v1/...` `Location`; successful delete returns `204`.

Comments are private to the owning Account. Task/Project ownership and Comment ownership are independently checked on every operation; missing and cross-user parent/comment IDs are indistinguishable `404 RESOURCE_NOT_FOUND`. An archived parent remains readable and its Comments may still be deleted, but creating or editing returns `400 VALIDATION_FAILED` with the parent ID field marked `READ_ONLY`. This preserves private-content deletion while preventing history changes on archived work. A stale edit/delete version returns `409 CONCURRENCY_CONFLICT`.

`format` is `PLAIN_TEXT` (the create default) or `MARKDOWN`. Input is non-blank and limited to 4,000 UTF-16 code units after normal request decoding. Plain text is normalized for line endings and must be rendered as text. The safe Markdown subset preserves normal Markdown text plus inline `http`/`https` links without userinfo; raw HTML/entities are escaped, inline/reference/shortcut images are flattened, reference/shortcut links are neutralized, and non-HTTP(S), malformed, or userinfo links are flattened to their label. NUL and other control characters except newline/tab are rejected. Clients must still use a Markdown renderer configured with raw HTML disabled and no unapproved extensions.

Comment deletion immediately purges the body and is intentionally irreversible; a body-free `COMMENT_DELETED` Activity Event remains. Create/edit/delete emit `COMMENT_CREATED`, `COMMENT_UPDATED`, or `COMMENT_DELETED` transactionally against the owning Task/Project subject. Event metadata never contains the Comment body. Task Detail `commentCount` and `activityEventCount` are now backed by fixed user-scoped count queries rather than placeholder zeros.

### Task and Project activity

Activity is a strongly parent-scoped, read-only resource at `GET /tasks/{taskId}/activity` and `GET /projects/{projectId}/activity`. Both endpoints return bounded newest-first `PageResponse` values; `page` defaults to 0, `size` defaults to 20, and `size` is limited to 1–100. Missing and cross-user subjects are indistinguishable `404 RESOURCE_NOT_FOUND`. A deleted subject remains readable only when the authenticated Account owns historical Activity for that exact typed subject UUID.

Each item contains only `id`, `actorUserId`, a closed `eventType`, an optional current `object`, and `occurredAt`. A current object contains canonical `type`, UUID, owner-scoped current `label`, and a LifeOS `href`. The object is `null` after deletion or when current owner-scoped resolution fails, allowing the client to render a safe non-linked fallback. Labels are resolved at read time and are never persisted as Activity snapshots. Correlation IDs, titles/descriptions as event metadata, Comment/Subtask bodies, request bodies, arbitrary maps, credentials, and whole-record before/after snapshots are not exposed.

Project lifecycle changes are recorded against the Project feed. Task creation, updates, status/lifecycle changes, duplication, bulk changes, MIT/dependency changes, and Subtask lifecycle changes are recorded against the Task feed; when the Task is linked to a Project, the same typed change is also recorded against that Project feed with the Task as its object. A Task moved between Projects records the change in both affected Project feeds. Idempotent lifecycle/bulk no-ops do not add duplicate Activity Events. Existing Comment create/edit/delete behavior remains transactional and content-free.

### Calendar aggregation

`GET /calendar/events` is an authenticated read-only projection over canonical LifeOS records. `startDate` and `endDate` are required inclusive local dates, `timeZone` is a required IANA timezone, `source` is an optional repeatable filter, and `limit` defaults to and cannot exceed 500. A request spans at most 62 local dates. The server converts the local-date edges to instants in the supplied timezone, so DST-short and DST-long days retain their true duration.

Supported source values are `TIME_BLOCK`, `TASK_DUE`, `MILESTONE`, `HABIT`, and `REVIEW`. LOS-0909 supplies bounded owner-scoped adapters for the canonical record types that currently exist: Time Blocks overlapping the range, non-deleted/non-archived Tasks whose due instant is in the range, and dated Milestones beneath non-archived Projects. `HABIT` and `REVIEW` are stable reserved contract values and return no invented events until their canonical persistence models land in LOS-1208 and LOS-1009.

Every event has a deterministic `id`, UUID `sourceId`, `sourceType`, title, source status, and optional Project/Task context. Timed events use canonical UTC `startAt`/`endAt`; all-day events use `localDate` and `allDay: true`. Results are sorted by effective start, all-day precedence, source type, and event ID. When more than `limit` events exist, the response returns the first deterministic page with `truncated: true`; Calendar remains a projection and never creates or stores a duplicate source record.

### Focus Sessions

Focus Session lifecycle resources are authenticated beneath `/focus-sessions`. `POST /focus-sessions` starts one session with optional `taskId`/`timeBlockId` context and required `plannedFocusDurationSeconds`/`plannedBreakDurationSeconds`; create returns `201`, the canonical session, and its `Location`. `GET /focus-sessions/{sessionId}` returns an owned session and `GET /focus-sessions/active` restores the sole Running or Paused session, returning `204` when none exists.

Lifecycle commands are `POST /focus-sessions/{sessionId}/pause`, `/resume`, `/start-break`, `/resume-focus`, `/complete`, `/cancel`, and `/interruptions`. Every command is authenticated, CSRF-protected, requires the current non-negative `version`, and requires an `Idempotency-Key` header containing 8–64 safe ASCII letters, digits, `.`, `_`, or `-`. Keys are scoped to the Account, bound to one operation/session, replay the canonical result without applying time twice, and expire after seven days. Reusing a key for a different command returns `409 IDEMPOTENCY_KEY_REUSED`; a stale version returns `409 CONCURRENCY_CONFLICT`; an invalid lifecycle edge returns `409 FOCUS_SESSION_STATE_CONFLICT`.

The server UTC clock is the only timing authority. Every response supplies `serverNow`, canonical phase/start/pause/end anchors, and actual focus/break seconds calculated at `serverNow`; browser intervals are presentation-only. Account-row write locking serializes two tabs even before a first session row exists, optimistic versions reject stale transitions, and the database independently permits only one Running or Paused session per Account.

Starting from a linked scheduled Time Block marks it In progress and infers its Task when no explicit Task is supplied; mismatched or unavailable context is rejected. Completing a session marks a non-terminal linked Time Block Completed and adds the session's confirmed whole focus minutes to the linked Task exactly once without completing the Task. Cancelling records truthful session duration, does not add Task time, and returns a linked In-progress Time Block to Scheduled. Missing and cross-user sessions or context never disclose another Account's data.

### Focus preferences

`GET /user/preferences` returns the authenticated Account's planning and Focus Mode defaults; `PUT /user/preferences` replaces the submitted preference set with CSRF protection and server-side validation. Focus fields are `focusDurationMinutes` and `breakDurationMinutes` (1–1,440), `longBreakDurationMinutes` (1–180), `focusSessionsBeforeLongBreak` (1–12), `autoStartBreaks`, `autoStartFocusSessions`, `soundEnabled`, and `browserNotificationsEnabled`.

New Accounts and existing rows upgraded by V18 receive conservative defaults: 25 minutes of focus, a 5-minute short break, a 15-minute long break after four completed Focus Sessions, and all automatic starts, sounds, and browser notifications disabled. LOS-0916 fields omitted by an older client retain their current values so a rolling frontend/backend deployment cannot reset them. A successful update affects future Focus Session starts only; it never mutates an active Focus Session's canonical planned durations or state.

### Daily time report

`GET /reports/time?date={localDate}&timeZone={ianaZone}` is an authenticated, private/no-store daily projection. It returns completed Focus Session focus/break minutes, unscheduled focus minutes, non-cancelled Time Block category allocation, planned Focus Time Block minutes, the optional daily focus target, active-session state, and an explicit `comparisonSource` of `PLANNED_FOCUS_BLOCKS`, `DAILY_TARGET`, or `NONE`.

The supplied IANA timezone converts the inclusive local date into start-inclusive/end-exclusive instants, retaining the true length of DST-short and DST-long days. Time Blocks overlapping the day are clipped to those instants. A completed Focus Session is attributed to the local date containing its `startedAt`; Cancelled sessions do not contribute to reported actual time, and durations use confirmed whole minutes. When planned Focus Time Blocks exist they are the denominator; otherwise the optional daily target is used. With neither, `comparisonMinutes` and `progressPercentage` are null rather than a misleading `0%`. Percentages may exceed 100 because actual time is not capped.

### Progress report

`GET /reports/progress?timeZone={ianaZone}&startDate={localDate}&endDate={localDate}&projectId={uuid}&labelId={uuid}&category={string}` is an authenticated, private/no-store progress aggregation projection adhering strictly to the Analytics Metric Dictionary (`docs/33-ANALYTICS-METRIC-DICTIONARY.md` v1.0.0). `timeZone` is required. `startDate` and `endDate` default to a 7-day range ending today in the target timezone when omitted. Date range queries are capped at a maximum of 366 days (1 year) to ensure bounded SQL execution.

The response aggregates task completion rates, focus execution ratios, project status breakdowns, goal progress averages, habit consistency (zero-data default), and review completion streaks. It exposes `metricDictionaryVersion: "1.0.0"` in response metadata and provides a non-causal accessible narrative (`summaryText`) describing factual progress for screen readers and UI components.

### Named reports API

`GET /reports/definitions` lists all supported named report metadata (`TASK_COMPLETION`, `TIME_ALLOCATION`, `PROJECT_PROGRESS`, `GOAL_EXECUTION`, `REVIEW_RITUALS`, `COMPREHENSIVE_PROGRESS`) including supported filter keys, default timeframe days, and asynchronous processing thresholds (`asyncThresholdDays`). `GET /reports/definitions/{reportType}` returns metadata for a single report definition.

`GET /reports/generate?reportType={type}&timeZone={ianaZone}&startDate={localDate}&endDate={localDate}&projectId={uuid}&labelId={uuid}&category={string}` and `GET /reports/named/{reportType}?timeZone={ianaZone}&...` return structured report payloads containing summary metrics (`metrics`), tabular breakdowns (`tables`), visualization chart series (`chartSeries`), and non-causal accessible narrative copy (`summaryText`). Range queries validate `startDate <= endDate`, cap maximum bounds at 366 days, and determine asynchronous execution thresholds (ranges > 90 days set `isAsynchronous: true`, `jobId`, and `status: "QUEUED"`). All endpoints adhere strictly to Analytics Metric Dictionary v1.0.0 and require authenticated user ownership.

### Habits

`/habits` is an authenticated, CSRF-protected, owner-scoped lifecycle resource. `POST /habits`, `GET /habits`, `GET /habits/{id}`, and `PUT /habits/{id}` provide create/list/read/update behavior; the list accepts an optional `archived` filter. `POST /habits/{id}/archive` and `/restore` require the current non-negative Habit `version`, return the canonical Habit, and are no-ops when the requested state is already current. `DELETE /habits/{id}` permanently deletes the Habit plus its entries and pause periods.

Entries are strongly parent-owned beneath `/habits/{id}/entries`. `GET` requires inclusive `from`/`to` local dates and permits at most 366 dates; `GET /today` resolves the date using the Habit's stored IANA timezone. `POST /increment` adds a positive count to the single entry for an explicit local date or the Habit's current local date, while `PUT /entries` sets the absolute positive count. The database retains one entry per `(habitId, localDate)`, so repeated increments update that row rather than creating duplicate daily records. `DELETE /entries?date=...` is idempotent and defaults to the Habit's current local date.

`POST /habits/{id}/pauses`, `GET /habits/{id}/pauses`, and `DELETE /habits/{id}/pauses/{pauseId}` manage inclusive, optionally open-ended pause ranges. `GET /habits/{id}/stats?from=...&to=...` returns bounded window counts and a target-meeting rate. Cadence eligibility, pause-aware consistency, streaks, late-edit rules, and timezone-change calculations remain governed by LOS-1210 rather than this plain window projection. Missing and cross-user Habit, entry, and pause targets are indistinguishable as `404 RESOURCE_NOT_FOUND`.

### Sprints

`/sprints` is an authenticated, CSRF-protected, owner-scoped lifecycle resource. `GET /sprints` accepts an optional comma-separated `status` filter; `POST /sprints`, `GET /sprints/{id}`, `PUT /sprints/{id}`, and planned-only `DELETE /sprints/{id}?version=...` provide CRUD. Lifecycle commands are `POST /sprints/{id}/start`, `/complete`, and `/cancel`. Scope commands add a Task, update its points/order, or mark the commitment removed while preserving history.

Sprint start/end are inclusive local dates without an implicit timezone. Non-cancelled windows for one Account may not overlap, and only one Sprint may be Active. Every write carries the current non-negative Sprint `version`; Account-row locking serializes overlap, one-active, completion and carry-over decisions, while stale versions return `409 CONCURRENCY_CONFLICT`. Missing and cross-user Sprint/Task IDs are indistinguishable. A Task must be owned, non-deleted, non-archived and non-terminal when committed.

Starting changes Planned to Active. Goal, capacity, Task add/remove and point changes append immutable events; removals retain the original commitment row. Completing an Active Sprint stores retrospective text/action items and stable committed/completed/added/removed/carry-over and story-point metrics. `BACKLOG` leaves open Tasks uncommitted after the completed source; `NEXT_SPRINT` requires an owned Planned target plus its current version and transactionally copies open, non-duplicate Task commitments. Completed and Cancelled Sprint scope is immutable.

### Weekly Plans

`/weekly-plans` is an authenticated, CSRF-protected, owner-scoped revision resource. `POST /weekly-plans` starts a Draft from a required `weekDate`; the server uses the Account's stored IANA timezone and ISO week-start preference to derive and persist the inclusive seven-local-date boundary. `GET /weekly-plans` lists revisions newest-week/revision first and accepts an optional `weekDate`; `GET /weekly-plans/{id}` returns one revision. `PUT /weekly-plans/{id}` replaces the Draft's capacities, outcomes and Task allocations with the current non-negative `version`.

Capacity input is zero to 1,440 available minutes for any date in the derived week; omitted week dates are explicitly returned with zero capacity. Outcomes are ordered user-authored statements. Each Task appears at most once in a revision, is owner-validated, may link to an outcome, and may be allocated to one local date or remain explicitly unscheduled. Missing and cross-user Weekly Plan/Task IDs are indistinguishable. Draft responses calculate current total planned/capacity minutes, overcapacity dates/minutes, pairwise overlaps among non-cancelled Time Blocks in exact timezone-derived week instants, unscheduled item count, and outcomes without items. These are named warnings and do not silently change allocations.

`POST /weekly-plans/{id}/finalize` requires the current version, refreshes current Task title/status snapshots, and atomically stores the warning summary and finalization instant. Repeating Finalize for the same Finalized revision returns that immutable revision without applying work twice. `POST /weekly-plans/{id}/reopen` requires the Finalized version and creates one Draft successor with a new identity/revision and remapped outcome/item identities; it never modifies the predecessor. Account-row locking and database constraints serialize create/finalize/reopen decisions, enforce one Draft per Account/week and reject stale writes with `409 CONCURRENCY_CONFLICT` or invalid lifecycle actions with `409 WEEKLY_PLAN_STATE_CONFLICT`.

## Problem Details

Failures use `application/problem+json` and this versioned shape:

```json
{
  "type": "https://buildwithpartha.tech/life-os/problems/v1/validation-failed",
  "title": "Validation failed",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "instance": "/life-os/api/v1/tasks",
  "code": "VALIDATION_FAILED",
  "correlationId": "c91cdba4-1d9f-4c5e-afcf-945ebca78a72",
  "errors": [{ "field": "title", "code": "NotBlank" }]
}
```

- `type` is a stable absolute URI beneath `/life-os/problems/v1/`; changing its meaning requires a new problem version or type.
- `title` and `detail` are safe API-owned summaries, not raw exception or validation messages.
- `instance` contains only the request path, never its query string.
- `code` is the stable machine-readable `ErrorCode` value.
- `correlationId` matches the response `X-Correlation-ID` header.
- `errors` is omitted when empty and otherwise contains only safe field names and validator codes. It never includes rejected values.
- Authentication and authorization failures use the same shape. Unexpected failures use `INTERNAL_ERROR` and never expose an exception class, cause, message or stack trace.

## Correlation IDs

Every response includes `X-Correlation-ID`. The server reuses an incoming value only when it begins with an ASCII letter or digit, contains only ASCII letters, digits, `.`, `_` or `-`, and is at most 64 characters. Missing or unsafe values are replaced by a generated UUID. The selected value is available to server logging context as `correlationId`; request bodies, query strings, credentials and private record content remain prohibited from logs.

## Health endpoints

- `GET /actuator/health/liveness` is public and reports only aggregate liveness status.
- `GET /actuator/health/readiness` is public and reports only aggregate readiness status, including database readiness internally.
- Component names and details are hidden from both responses.
- The health root and all other actuator paths are not public. Configuration leaves non-health capabilities unexposed, and security denies every actuator path except the two probes.
- Health endpoints are operational exceptions to the versioned product API base and do not create a product resource contract.

## Security

- Browser authentication is the session cookie. Frontend code never reads it.
- `GET /auth/session` supplies the current safe user profile and CSRF bootstrap information.
- All mutations require a valid CSRF token and authenticated server-side ownership checks.
- Login/signup/reset endpoints have stricter rate limits and generic responses where account enumeration is possible.

## Testing contract

- Every endpoint has success, validation, unauthenticated, forbidden/cross-user, not-found, and conflict tests where relevant.
- OpenAPI examples are validated in CI.
- Frontend integration uses generated or schema-checked types; silent contract drift fails CI.
