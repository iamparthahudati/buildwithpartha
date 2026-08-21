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
