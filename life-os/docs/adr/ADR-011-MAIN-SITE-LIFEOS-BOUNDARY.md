# ADR-011 — Main buildwithpartha site and LifeOS deployment boundary

- Status: Accepted
- Date: 2026-08-16
- Owner: Partha
- Ticket(s): LOS-0105
- Supersedes: None
- Superseded by: None

## Context

`buildwithpartha.tech` is the main product/site. LifeOS is a private sub-product being built now at `buildwithpartha.tech/life-os`. The main site will also move toward React, Java, PostgreSQL, Docker, Caddy and Cloudflare. The architecture must prevent path, cookie, cache, data, release and runtime collisions while allowing both products to use the same technology family and VPS.

## Decision drivers

- Keep the main site authoritative at `/` and LifeOS at `/life-os`.
- Allow independent development and releases so private LifeOS changes do not require redeploying the public main site.
- Keep LifeOS account/data/security boundaries narrower than the public site.
- Reuse operational knowledge and, later, intentionally chosen packages without creating a shared monolith accidentally.
- Preserve the existing main-site implementation until its own migration tickets are approved.

## Options considered

### Option A — One React application and one Java API for everything

Benefits: fewer deployments and easy in-process code reuse. Costs: tightly coupled releases, broader authentication/caching blast radius, harder separation of public and highly private data, and main-site migration would block LifeOS.

### Option B — Separate deployable main and LifeOS applications behind one origin

Benefits: independent releases, explicit security/data boundaries, easier rollback, and both products may still use the same stack. Costs: more containers/configuration and shared code must be extracted deliberately.

## Decision

Use Option B.

- The main site owns `/` and any future main API path such as `/api/*`.
- LifeOS owns `/life-os/*`; its API owns `/life-os/api/v1/*`.
- Caddy matches most specific paths first: LifeOS API, LifeOS web/assets, main API, then main web fallback.
- LifeOS frontend and backend remain separate deployable units under `life-os/apps/web` and `life-os/apps/api`.
- A future main-site React/Java migration uses its own application/service names, ports, environment prefixes and deployment tickets.
- Both may use one VPS and PostgreSQL server, but LifeOS uses a separate logical database (or equivalently isolated schema only after a new ADR), separate application role, migrations, backup validation and connection configuration.
- Shared design/code packages are introduced only when stable duplication proves value; product-specific domain/auth code is not shared by default.

## Consequences

### Positive

- LifeOS can launch and roll back independently while the main site remains available.
- Same technologies cause no inherent conflict because routes, services, data and configuration are namespaced.
- Private LifeOS sessions and cache rules do not need to apply to the public root site.

### Negative and risks

- The VPS runs additional services and requires explicit resource limits/monitoring.
- Caddy route order and SPA fallbacks must be tested to prevent the root application swallowing `/life-os` paths.
- Two similar stacks may duplicate dependencies until shared packages are justified.

### Follow-up work

- LOS-0210 implements/test the local path-first gateway.
- LOS-1604 implements production Caddy routing and isolation.
- LOS-1606 configures Cloudflare cache/security behavior.
- The future main-site migration gets its own backlog and does not alter LifeOS tickets silently.

## Security, privacy and data impact

- LifeOS session and CSRF cookies use unique names and `Path=/life-os`; no domain-wide session cookie.
- LifeOS service workers, if enabled, use scope `/life-os/` and cannot control `/`.
- Cloudflare and origin caching bypass private HTML, auth and API routes; only fingerprinted public assets may receive long-lived caching.
- LifeOS and the main site use separate database identities and cannot query each other's tables.
- Logs, backups, secrets and rate-limit keys are namespaced by product/environment.

## Rollout and rollback

Introduce LifeOS routes/services without changing the root application. Validate root and LifeOS deep-link/API routes independently. Rollback removes or reverts only LifeOS services/routes while leaving the main site route active. Database migrations follow LifeOS compatibility rules and are not coupled to main-site migrations.

## Validation

- Automated routing matrix proves each path reaches only its intended service and SPA fallback.
- Cookie tests prove LifeOS auth cookies are not sent outside `/life-os`.
- Cache tests prove private responses are never shared/cached publicly.
- Deploy/rollback rehearsal proves one product remains available while the other changes.

