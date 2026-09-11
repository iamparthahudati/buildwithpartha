# LifeOS staging environment specification

- Status: Accepted
- Date: 2026-09-03
- Ticket: [LOS-1605](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-1601](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/35-VPS-INVENTORY-AND-HARDENING.md), [LOS-1602](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md), [LOS-1603](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/37-PRODUCTION-CONTAINERS.md), [LOS-1604](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/38-PRODUCTION-COMPOSE-AND-CADDY.md)

---

## 1. Executive summary & architectural scope

This specification defines the staging environment architecture, Docker Compose multi-container topology, network segmentation, volume persistence, resource quotas, container runtime security, safe test email and file handling, synthetic data policy, and Caddy ingress routing rules for LifeOS.

In accordance with [docs/ENVIRONMENTS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/ENVIRONMENTS.md), [docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md), and [docs/38-PRODUCTION-COMPOSE-AND-CADDY.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/38-PRODUCTION-COMPOSE-AND-CADDY.md), Staging is a fully isolated, production-like release validation environment running on the 4GB VPS host (`srv1883798.hstgr.cloud`).

Staging allows testing release candidates, database migrations, security controls, and new features under production-equivalent runtime parameters without impacting production data, credentials, search indexing, or service availability.

This document establishes the staging Compose standard (`life-os/infra/compose/compose.staging.yml`), Caddy ingress routing configuration (`life-os/infra/caddy/Caddyfile.staging` and `deploy/caddy/Caddyfile`), and automated verification contract (`life-os/scripts/validate-staging-environment.sh`).

---

## 2. Environment & domain isolation parameters

Staging operates under a dedicated domain boundary completely separate from production:

| Environment | UI Domain / URL | API Base Path | Database Name | Secrets File | Storage Namespace |
| --- | --- | --- | --- | --- | --- |
| **Production** | `https://buildwithpartha.tech/life-os` | `/life-os/api/v1` | `lifeos_prod` | `/etc/life-os/secrets/.env.production` | `lifeos-prod-postgres-data` |
| **Staging** | `https://staging.buildwithpartha.tech/life-os` | `/life-os/api/v1` | `lifeos_staging` | `/etc/life-os/secrets/.env.staging` | `lifeos-staging-postgres-data` |

### Strict Isolation Rules:
1. **Zero Secret / Credential Sharing**: Staging utilizes independent database passwords, JWT signing peppers, session cookies (`lifeos_staging_session`), and encryption keys generated per [docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md).
2. **Zero Database / State Sharing**: Staging uses a dedicated PostgreSQL container and dedicated named volume (`lifeos-staging-postgres-data`). Production database backups or state are never restored directly into staging without an explicit, documented sanitization pass.
3. **Safe Test Email Policy**: Staging mail is directed to a local sandbox or mail catcher endpoint (`SPRING_MAIL_HOST=localhost`, `SPRING_MAIL_PORT=1025`). Staging can never dispatch outbound email to real user email addresses.
4. **Isolated File & Attachment Storage**: Staging uses a dedicated local mount or isolated bucket prefix (`/tmp/lifeos-staging-attachments`) to ensure production files are never mutated or exposed.

---

## 3. Multi-container service topology

The staging deployment consists of four dedicated container services managed via Docker Compose:

| Service Name | Container Image | Internal Port | Description & Responsibilities |
| --- | --- | --- | --- |
| `caddy-staging` | `caddy:2.9.1-alpine` | `80`, `443` | Edge reverse proxy for staging, TLS termination, noindex headers, rate limiting, and security policy enforcement. |
| `web-staging` | Custom `life-os-web:prod` (`nginx:1.27.4-alpine`) | `8080` | Static asset Nginx server serving the React SPA bundle for staging. |
| `api-staging` | Custom `life-os-api:prod` (`eclipse-temurin:21-jre-alpine`) | `8080` | Backend Spring Boot Java application serving business logic and REST APIs for staging. |
| `postgres-staging` | `postgres:18.4-alpine` | `5432` | Staging PostgreSQL database storing synthetic test data. |

---

## 4. Network segmentation & network isolation

Services are segmented into isolated Docker overlay/bridge networks dedicated to staging:

```
                  +---------------------------------------------------+
                  |                 Public Internet                   |
                  +-------------------------+-------------------------+
                                            | (80 / 443)
                                            v
                  +---------------------------------------------------+
                  |               caddy-staging service               |
                  +------------+-------------------------+------------+
                               |                         |
        (staging-frontend-net) |                         | (staging-backend-net)
                               v                         v
                  +------------------------+ +------------------------+
                  |   web-staging service  | |   api-staging service  |
                  |     (React / Nginx)    | |     (Spring Boot)      |
                  +------------------------+ +-----------+------------+
                                                         |
                                                         | (staging-db-net)
                                                         v
                                             +------------------------+
                                             | postgres-staging service|
                                             |     (PostgreSQL 18.4)  |
                                             +------------------------+
```

### Network Definitions:
1. `staging-frontend-net`: Shared network between `caddy-staging` and `web-staging`.
2. `staging-backend-net`: Shared network between `caddy-staging` and `api-staging`.
3. `staging-db-net`: Private backend network between `api-staging` and `postgres-staging`. `caddy-staging` and `web-staging` have zero access to `postgres-staging`. Port `5432` is not exposed publicly.

---

## 5. Resource boundaries & allocation limits (4GB VPS Allocation)

To support concurrent execution of Production (~3.0GB RAM limit) and Staging on the 4GB VPS host ([docs/35-VPS-INVENTORY-AND-HARDENING.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/35-VPS-INVENTORY-AND-HARDENING.md)), staging services enforce strict memory and CPU boundaries:

| Service | CPU Limit | Memory Limit | CPU Reservation | Memory Reservation | Rationale |
| --- | --- | --- | --- | --- | --- |
| `api-staging` | `1.00` | `768M` | `0.15` | `256M` | Spring Boot JVM heap optimized for staging validation. |
| `postgres-staging` | `0.50` | `512M` | `0.10` | `128M` | PostgreSQL shared buffers and staging query workloads. |
| `web-staging` | `0.25` | `128M` | `0.02` | `32M` | Static Nginx asset serving and SPA fallbacks. |
| `caddy-staging` | `0.25` | `128M` | `0.02` | `32M` | Reverse proxy and TLS termination for staging domain. |
| **Staging Total** | **2.00 vCPU** | **1536MB RAM** | **0.29 vCPU** | **448MB RAM** | Ensures co-existence with production under 4GB total host RAM limit. |

---

## 6. Container runtime security & health checks

Staging enforces identical least-privilege security controls as production:

1. **Non-Root Execution**:
   - `USER 10001` (`lifeos-app`) enforced in `api-staging` and `web-staging`.
2. **Read-Only Root Filesystems**:
   - `read_only: true` on `api-staging`, `web-staging`, and `caddy-staging` with `tmpfs` mounts for `/tmp`, `/var/cache`, `/var/run`.
3. **Capability Drops & Security Options**:
   - `cap_drop: ALL` and `no-new-privileges: true`.
4. **Health Monitoring & Auto-Restart**:
   - `api-staging` health check: `wget http://127.0.0.1:8080/life-os/api/v1/actuator/health`.
   - `web-staging` health check: `wget http://127.0.0.1:8080/healthz`.
   - `postgres-staging` health check: `pg_isready -U lifeos_staging_app -d lifeos_staging`.
   - Container restart policy: `restart: unless-stopped`.

---

## 7. Caddy ingress routing & search indexing restriction

Caddy handles ingress for domain `staging.buildwithpartha.tech`.

### Route Order & Matching Matrix:

1. **Staging API (`/life-os/api/*`)**:
   - Reverse proxies to `http://api-staging:8080`.
   - Preserves original client IP (`X-Forwarded-For`, `X-Real-IP`, `X-Forwarded-Proto`).
   - Rate limit: 100 requests / minute per client IP.
   - Request body limit: `10MB`.

2. **Staging Web SPA (`/life-os/*`)**:
   - Reverse proxies to `http://web-staging:8080`.
   - Web container Nginx handles SPA fallback to `/life-os/index.html`.

### Search Engine Indexing Protection:
Staging injects explicit anti-indexing headers across all routes to prevent search engines from indexing staging content or synthetic data:
- `X-Robots-Tag "noindex, nofollow, noarchive, nosnippet"`

### Security Headers Policy:
- `Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"`
- `X-Content-Type-Options "nosniff"`
- `X-Frame-Options "DENY"`
- `Referrer-Policy "strict-origin-when-cross-origin"`
- `Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()"`
- `X-XSS-Protection "0"`
- `Cross-Origin-Opener-Policy "same-origin"`
- `Cross-Origin-Resource-Policy "same-origin"`
- `Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"` (per [docs/51-SECURITY-HEADERS-AND-CSP.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/51-SECURITY-HEADERS-AND-CSP.md))

### Logging & Compression:
- Response compression enabled via `zstd` and `gzip`.
- Structured JSON access logging enabled for staging requests.

---

## 8. Secrets injection & environment file policy

Environment configuration and credentials are injected into Docker Compose via `env_file` referencing `/etc/life-os/secrets/.env.staging` per [docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md).

Host permissions on `/etc/life-os/secrets/.env.staging` are set to `0600` owned by `lifeos-deploy`. Zero secrets are committed to git.

---

## 9. Synthetic data & deployment candidate release contract

1. **Deploy Candidate Validation**: Prior to merging any release candidate to `master`, the candidate container image and Flyway migrations are deployed to staging.
2. **Migration & Smoke Testing**: Flyway migrations run automatically on startup in `api-staging`. Automated smoke tests verify database schema integrity and health endpoints without production impact.
3. **Synthetic User Fixtures**: Staging data consists strictly of synthetic test users (`staging-user@buildwithpartha.tech`) and test entities created via seed scripts or migration fixtures.

---

## 10. Automated verification

Staging environment structure and configuration are validated via automated script:
`sh life-os/scripts/validate-staging-environment.sh --dry-run`

The validator enforces static assertions on:
1. Staging environment specification (`39-STAGING-ENVIRONMENT.md`).
2. Staging Compose syntax and service declarations (`compose.staging.yml`).
3. Isolated network declarations (`staging-frontend-net`, `staging-backend-net`, `staging-db-net`).
4. Staging persistent volume (`lifeos-staging-postgres-data`).
5. Non-root execution (`USER 10001`), read-only root filesystems, and security flags.
6. Memory and CPU resource allocation limits.
7. Caddyfile route ordering, `X-Robots-Tag` noindex header, and security headers.
8. Secrets injection policy (`/etc/life-os/secrets/.env.staging`).
