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
- Strict CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and anti-framing policy at Caddy/Cloudflare.
- Validate all input server-side; encode output; sanitize any future rich text using an allowlist.
- Rate limit login, signup, verification resend, reset, search, exports, and write bursts.
- Generic auth recovery responses prevent account enumeration.

## Authorization and privacy

- Follow the field-to-purpose inventory, retention classes, consent/notice boundaries, provider register and data-flow gates in `31-PRIVACY-DATA-LIFECYCLE.md`.
- Repositories/services require authenticated `userId`; controllers do not accept a user ID for ownership.
- Add negative cross-user tests for every user-owned resource.
- Logs redact credentials, tokens, cookies, headers, note content, and sensitive search text.
- Exports require recent authentication, are account-scoped, and expire according to the approved retention class.
- Account deletion is confirmed, delayed/recoverable, auditable, propagates through live/derived/provider data, and remains deleted after a backup restoration.

## Operations

- Secrets are VPS/CI environment values, never committed.
- Containers run unprivileged, use read-only filesystems where practical, and expose only Caddy ports.
- PostgreSQL stays on a private network and uses a least-privilege application role.
- Nightly encrypted backups, off-VPS copies, retention policy, and quarterly restore drill.
- Dependency, image, and secret scans run in CI. Production deploy requires clean high/critical findings or an explicit documented exception.

## Verification before launch

- Automated unit/integration/E2E security cases.
- Dependency and container scan.
- OWASP ZAP baseline against staging plus manual auth/IDOR/CSRF checks.
- Cloudflare and origin TLS configuration review.
- Backup restoration and rollback rehearsal.
