# API conventions

Base path: `/life-os/api/v1`.

## Resources

Use plural nouns: `/projects`, `/tasks`, `/time-blocks`, `/focus-sessions`, `/sprints`, `/weekly-plans`, `/goals`, `/notes`, `/brain-dump-items`, `/habits`, `/notifications`, `/reports`.

Authentication endpoints: `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/session`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/forgot-password`, `/auth/reset-password`.

## Request and response rules

- JSON uses camelCase. IDs are UUID strings. Date-only values use `YYYY-MM-DD`; instants use RFC 3339 UTC.
- Create returns `201` with the resource and `Location`. Update returns `200`; delete/restore returns a small result body where the UI needs it.
- Pagination uses `page`, `size`, and stable `sort`; responses return `items`, `page`, `size`, `totalItems`, `totalPages`.
- Filters are explicit query parameters and documented in OpenAPI.
- Errors use RFC Problem Details with `type`, `title`, `status`, `detail`, `instance`, `code`, `correlationId`, and optional field `errors`.
- Use `If-Match`/version or an equivalent explicit version field for collision-sensitive updates.
- Never expose entity classes directly from controllers; use request/response records.

## Security

- Browser authentication is the session cookie. Frontend code never reads it.
- `GET /auth/session` supplies the current safe user profile and CSRF bootstrap information.
- All mutations require a valid CSRF token and authenticated server-side ownership checks.
- Login/signup/reset endpoints have stricter rate limits and generic responses where account enumeration is possible.

## Testing contract

- Every endpoint has success, validation, unauthenticated, forbidden/cross-user, not-found, and conflict tests where relevant.
- OpenAPI examples are validated in CI.
- Frontend integration uses generated or schema-checked types; silent contract drift fails CI.

