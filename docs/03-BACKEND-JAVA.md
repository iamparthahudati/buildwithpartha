# 03 — Backend (Java 21 + Spring Boot 3)

The backend serves editable content to the public site, handles the newsletter, and powers the `/admin`
panel. **The eight tools never call it** — they run in the browser. Keep the backend small and boring.

## Stack

- **Java 21** (LTS), **Spring Boot 3.x**, **Gradle**.
- Starters: `spring-boot-starter-web`, `-validation`, `-data-jpa`, `-security`, `-actuator`, `-mail`.
- **PostgreSQL 16** via JPA/Hibernate. **Flyway** for versioned migrations.
- **Bucket4j** (or Spring rate-limit filter) for rate limiting. **springdoc-openapi** for API docs (internal only).
- Build → a single runnable jar → a small distroless/temurin container.

## Package layout (feature-first, not layer-first)

Group by feature so each area is understandable on its own.

```
tech.buildwithpartha
├── article/     ArticleController, ArticleService, ArticleRepository, Article (entity), dtos
├── deal/        …same shape
├── stack/       …same shape
├── newsletter/  SubscribeController, SubscriptionService, Subscriber, confirm-token logic
├── admin/       AdminController(s) for CRUD, AdminUser, auth endpoints
├── security/    SecurityConfig, session/CSRF, rate-limit filter, 2FA (TOTP)
├── common/      GlobalExceptionHandler, audit log, base entity, validation helpers
└── Application.java
```

Each feature exposes: an **entity** (DB row), a **repository** (DB access), a **service** (rules), a
**controller** (HTTP), and **DTOs** (the shapes sent over the wire — never expose entities directly).

## Database schema (Flyway migrations)

Written as versioned SQL in `src/main/resources/db/migration/` (`V1__baseline.sql`, `V2__…`). Never edit a
shipped migration; add a new one.

### `article`
| column | type | notes |
| --- | --- | --- |
| id | bigserial PK | |
| slug | text unique not null | URL segment; indexed |
| kicker | text | e.g. "Field notes · Postgres" |
| title | text not null | |
| standfirst | text | lead paragraph |
| body | text not null | Markdown/MDX source (see §Article body) |
| hero_image_id | text | reference to an asset |
| read_minutes | int | |
| word_count | int | |
| status | text not null | `draft` \| `published` \| `archived` |
| published_at | timestamptz | null until published |
| created_at / updated_at | timestamptz | |
| deleted_at | timestamptz | soft delete |

### `deal`
`id, name, plan, price_text (tabular), reason, cta_url, affiliate (bool), position (int), active (bool), reviewed_month (text), created/updated/deleted_at`

### `stack_item`
`id, group_name, name, role, note, url, affiliate (bool), position (int), active (bool), created/updated/deleted_at`

### `subscriber`
`id, email (citext unique), status (pending|active|unsubscribed), confirm_token (hashed), confirmed_at, unsubscribed_at, source, created_at`
- Email stored case-insensitive (`citext`). Confirm/unsubscribe tokens stored **hashed**, never plaintext.

### `admin_user`
`id, email, password_hash (bcrypt/argon2), totp_secret (encrypted), failed_attempts, locked_until, last_login_at, created_at`
- One admin for first release. Password hashed with a strong adaptive hash; TOTP secret encrypted at rest.

### `ad_config`
`id, density (quiet|balanced|heavy), leaderboard_snippet, midarticle_snippet, sidebar_snippet, updated_at`
- Snippets are the ad-network embed code, output through the single `AdSlot`. One row.

### `audit_log`
`id, actor (admin_user id), action, entity_type, entity_id, before (jsonb), after (jsonb), ip, created_at`
- Every admin write appends here. Never deleted.

## API surface

Convention: JSON in/out, `/api` prefix, plural nouns, DTOs both ways, validation on every input,
consistent error shape (§Errors). **Public** = no auth, cacheable, read-only. **Admin** = session + CSRF required.

### Public (read-only)
| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/health` | liveness (internal detail hidden) |
| GET | `/api/articles?limit&cursor` | published articles, newest first (paginated) |
| GET | `/api/articles/{slug}` | one published article (404 if draft/missing) |
| GET | `/api/deals` | active deals, ordered by `position` |
| GET | `/api/stack` | active stack items, grouped |

### Public (write — heavily guarded)
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/newsletter/subscribe` | body `{email}`; validate, **rate-limit**, honeypot check, store *pending*, email confirm link. Always returns the same generic success (don't reveal if an email already exists). |
| GET | `/api/newsletter/confirm?token` | mark *active*; token single-use, expiring, hashed-compare |
| GET | `/api/newsletter/unsubscribe?token` | one-click unsubscribe |

### Admin (auth required — session cookie + CSRF)
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/admin/login` | email+password (+TOTP); sets httpOnly session cookie; brute-force lockout |
| POST | `/api/admin/logout` | invalidate session |
| GET/POST/PUT/DELETE | `/api/admin/articles[/{id}]` | full CRUD; DELETE = soft delete; POST publish triggers revalidation |
| GET/POST/PUT/DELETE | `/api/admin/deals[/{id}]` | CRUD |
| GET/POST/PUT/DELETE | `/api/admin/stack[/{id}]` | CRUD |
| GET | `/api/admin/subscribers?…` | list/export (PII — least privilege) |
| GET/PUT | `/api/admin/ad-config` | read/update ad snippets + density |
| GET | `/api/admin/audit?…` | read the audit log |

Full auth/hardening details are in **doc 4 §Admin** and **§Auth**.

## Article body: how content is stored and rendered safely

Two safe options — pick one in Phase 6:

1. **Markdown/MDX source in `article.body`.** Admin edits Markdown; the **public site** compiles it to HTML at build time (SSG). Safe because compilation is controlled and the output is sanitized. Preferred — matches the design handoff's MDX direction.
2. **Sanitized HTML.** Admin uses a rich-text editor; the **server sanitizes** on save (allowlist tags/attrs, strip scripts) and stores clean HTML. Use only a vetted sanitizer; never trust editor output.

Either way: **content is untrusted until sanitized/compiled.** Never inject raw stored HTML into a page. (doc 4 §XSS)

## Errors (one consistent, safe shape)

A `GlobalExceptionHandler` maps every exception to:

```json
{ "error": "validation_failed", "message": "Email is not valid", "fields": { "email": "…" } }
```

- **Never** return a stack trace, SQL, or internal class names to the client.
- Log the full detail server-side with a correlation id; return only the id + a safe message to the client.
- Validation errors → 400; auth → 401; forbidden → 403; missing → 404; rate-limited → 429; else → generic 500.

## Newsletter flow (double opt-in)

1. `POST /subscribe` → validate email format + honeypot + rate limit.
2. Create/refresh a `pending` subscriber with a **hashed**, expiring `confirm_token`; email the plaintext token link once.
3. Visitor clicks → `GET /confirm?token` → constant-time hashed compare → set `active`, clear token.
4. Every email includes a one-click `unsubscribe` token link.
5. `subscribe` **always** returns the same generic "check your inbox" — it never reveals whether an address was already on the list (privacy + no user enumeration).

## Configuration (12-factor)

All config from **environment variables** — DB URL/user/password, mail credentials, the session secret,
the admin bootstrap. Nothing secret in `application.yml` or git. `application.yml` holds only non-secret
defaults and `${ENV_VAR}` references. (doc 6 §Config, doc 4 §Secrets)

## Testing

- **Unit** tests for services (rules, token logic, validation).
- **Web-layer** tests (`@WebMvcTest`) for controllers incl. auth: a public route works unauthenticated; an admin route returns 401/403 unauthenticated and for the wrong user.
- **Integration** tests against a real Postgres via **Testcontainers** (not H2 — behavior must match prod).
- **Security** tests: CSRF required on writes, rate limit trips, IDOR blocked (can't fetch another entity you shouldn't), soft-deleted content 404s publicly.

## What's intentionally NOT in the backend (first release)

- No user accounts for visitors (only the newsletter).
- No comments, no search service, no file-upload-from-public.
- No second admin / roles system (one hardened admin; add roles when a second editor appears).
- No direct DB access from the public site — always through the API.
