# Security baseline

## Identity and sessions

- Normalize emails before uniqueness checks without altering the user's display form.
- Use Argon2id for passwords, password-length controls, breached/common-password screening where feasible, and no arbitrary periodic reset.
- Verify email before permitting full application access.
- Store only a hash of session, verification, and reset tokens.
- Session cookie: `Secure`, `HttpOnly`, `SameSite=Lax`, scoped to `/life-os`; rotate on login and revoke on logout/password reset.
- Provide session listing and “sign out all devices”.

## Web defenses

- Same-origin architecture; production CORS disabled.
- CSRF token on every mutation; reject missing/mismatched origin on sensitive requests.
- Strict CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, and anti-framing policy across Caddy, Nginx, and Spring Boot API tiers per [51-SECURITY-HEADERS-AND-CSP.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/51-SECURITY-HEADERS-AND-CSP.md).
- Validate all input server-side; encode output; sanitize any future rich text using an allowlist.
- Rate limit login, signup, verification resend, reset, search, exports, and write bursts.
- Generic auth recovery responses prevent account enumeration.
- Only aggregate liveness and readiness probes are public. Actuator discovery, the health root, component detail and every other actuator capability remain unavailable or denied.
- Every response receives a safe correlation ID. Caller values are length/character allowlisted before entering response headers or logging context; unsafe values are replaced.
- The OpenAPI JSON is authenticated, contains no private runtime data, and documents the `lifeos_session` HttpOnly cookie plus `X-CSRF-TOKEN` mutation requirement. Interactive documentation is disabled.

## Authorization and privacy

- Follow the field-to-purpose inventory, retention classes, consent/notice boundaries, provider register and data-flow gates in `31-PRIVACY-DATA-LIFECYCLE.md`.
- Repositories/services require authenticated `userId`; controllers do not accept a user ID for ownership.
- Add negative cross-user tests for every user-owned resource.
- Logs redact credentials, tokens, cookies, headers, note content, and sensitive search text.
- Problem responses expose safe API-owned text, stable codes and field validator names only. They never expose exception messages/classes, stack traces, causes, rejected field values or query strings.
- Exports require recent authentication, are account-scoped, and expire according to the approved retention class.
- Account deletion is confirmed, delayed/recoverable, auditable, propagates through live/derived/provider data, and remains deleted after a backup restoration.

## Operations

- Secrets are VPS/CI environment values, never committed.
- Containers run unprivileged, use read-only filesystems where practical, and expose only Caddy ports.
- PostgreSQL stays on a private network and uses a least-privilege application role.
- Nightly encrypted backups, off-VPS copies, retention policy, and quarterly restore drill.
- Dependency, image, and secret scans run in CI and nightly schedules per [52-DEPENDENCY-SECRET-CONTAINER-SCANS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/52-DEPENDENCY-SECRET-CONTAINER-SCANS.md). Production deploy requires clean high/critical findings or an explicit documented exception.

## Verification before launch

- Automated unit/integration/E2E security cases.
- Dependency, secret, container vulnerability scanning, and SBOM/provenance verification per [52-DEPENDENCY-SECRET-CONTAINER-SCANS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/52-DEPENDENCY-SECRET-CONTAINER-SCANS.md).
- OWASP ZAP baseline and active staging penetration checks plus IDOR/CSRF/session/reset/upload/export/cache tests per [53-APPLICATION-SECURITY-TESTING.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/53-APPLICATION-SECURITY-TESTING.md). Fix or formally accept all findings.
- Cloudflare and origin TLS configuration review.
- Backup restoration and rollback rehearsal.
