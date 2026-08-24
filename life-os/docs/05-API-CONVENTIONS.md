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
  "errors": [{"field": "title", "code": "NotBlank"}]
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
