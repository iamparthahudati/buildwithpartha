# Architecture

## Deployment shape

```text
Browser
  -> Cloudflare (DNS, proxy, TLS, WAF/rate rules)
    -> VPS Caddy origin
      -> /life-os/api/v1/* -> LifeOS Spring Boot container
      -> /life-os/*        -> LifeOS React application/assets
      -> /api/*            -> future main-site Java API (when implemented)
      -> /*                -> main buildwithpartha site

LifeOS API
  -> LifeOS PostgreSQL logical database and application role
  -> SMTP provider for verification/reset email
```

Cloudflare terminates public traffic; the origin also uses valid TLS and Cloudflare SSL mode must be Full (strict). The database is never exposed publicly. Caddy is the only public origin service. Routes are matched from most specific to least specific so the main-site SPA fallback cannot swallow LifeOS routes.

The binding personal-data inventory, processor review, retention classes, browser-storage limits, export/deletion propagation and optional file/AI gates are defined in `31-PRIVACY-DATA-LIFECYCLE.md`. Any new store, cache, queue, index, log, email field or external provider must update that map before implementation.

The main site and LifeOS may use the same technology family and VPS, but they are independently deployable products with distinct service names, ports, configuration prefixes, cookies, database identities, migrations, cache rules and rollback paths. See ADR-011.

## Repository layout

```text
life-os/
  AGENTS.md
  apps/
    web/                         React/Vite application
      public/
      src/
        app/                     providers and bootstrap
        assets/
        components/
          ui/                    atoms only
          forms/                 composed form controls
          data-display/          tables, charts, lists
          feedback/              toast, alert, dialog, empty/error
          navigation/            nav and breadcrumbs
          layout/                shell and responsive regions
        features/                domain-specific components/hooks/API
        hooks/
        lib/                     API client, dates, validation, utilities
        routes/                  route-level composition only
        state/                   narrowly shared client state
        styles/                  tokens and global styles
        test/                    shared test setup/builders
        types/
    api/                         Spring Boot service
      src/main/java/tech/buildwithpartha/lifeos/
        common/                  errors, pagination, base types
        config/                  security, web, persistence, mail
        auth/ user/ project/ task/ calendar/ timeblock/
        focus/ sprint/ goal/ note/ braindump/ habit/
        report/ search/ notification/ audit/
      src/main/resources/
        db/migration/            Flyway SQL
      src/test/
  infra/
    caddy/ compose/ postgres/ scripts/ monitoring/
  docs/
    backlog/ adr/ handoffs/
```

## Frontend rules

- React 19 with TypeScript and Vite; production `base` is `/life-os/`.
- React Router owns protected routes under `/app`; browser refreshes are handled by Caddy's SPA fallback without intercepting `/life-os/api/*`.
- TanStack Query owns server state and caching. Local component state remains local. Use a tiny client store only for genuinely global ephemeral presentation state such as the active Focus Session display and navigation drawer.
- Zod validates environment/config and boundary payloads. React Hook Form may coordinate non-trivial forms.
- Use CSS variables for tokens and CSS Modules or a single agreed component styling approach. Do not mix multiple styling systems.
- Route files compose feature components and contain minimal business logic.

## Backend rules

- Java 21; LOS-0202 locks the initial backend to Spring Boot 4.1.0 and the checksummed Gradle 9.5.1 wrapper. Updates must follow the LOS-0203 dependency policy rather than arriving in unrelated tickets.
- Package by domain. Within a domain use `api`, `application`, `domain`, and `infrastructure` subpackages when complexity warrants; avoid a global controller/service/repository bucket.
- REST JSON API with OpenAPI generated from code and consumer-facing examples.
- Spring Data JPA for normal persistence; explicit queries for reports/search where necessary.
- Flyway owns the database schema. Hibernate schema auto-generation is disabled outside tests.
- Bean Validation at request boundaries; domain rules in application/domain services.
- Problem Details (`application/problem+json`) for errors; no stack traces or internal exception names in responses.

## Authentication model

- Signup uses normalized unique email, display name, password policy, acceptance of terms, and email verification.
- Passwords are hashed with Argon2id using a reviewed parameter set.
- Login creates a random opaque server-side session; the browser receives only a `Secure`, `HttpOnly`, `SameSite=Lax`, path-scoped cookie.
- Session IDs rotate on authentication and privilege-sensitive events. Logout revokes the server session.
- Mutating requests require CSRF protection. CORS is not enabled in production because UI and API are same-origin.
- Password reset tokens are single-use, hashed at rest, short-lived, and invalidate existing sessions after success.

## Data and consistency

- PostgreSQL UUID primary keys. Every user-owned table contains `user_id` and indexes start with it where query patterns require.
- Optimistic locking protects mutable aggregate roots where concurrent edits matter.
- Idempotency keys protect retried create operations that could duplicate important records.
- Transaction boundaries live in application services.
- Domain events/outbox are introduced only for reliable email/notification jobs, not as premature distributed architecture.

## Observability

- Structured JSON logs with request/correlation ID; never log passwords, session IDs, CSRF tokens, reset tokens, or note bodies.
- Health endpoints distinguish liveness/readiness and are restricted appropriately.
- Metrics cover latency, error rate, authentication failures, job failures, DB pool, disk, CPU, and backup age.
