# LifeOS production Compose and Caddy routing specification

- Status: Accepted
- Date: 2026-09-03
- Ticket: [LOS-1604](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-1601](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/35-VPS-INVENTORY-AND-HARDENING.md), [LOS-1602](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md), [LOS-1603](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/37-PRODUCTION-CONTAINERS.md)

---

## 1. Executive summary & architectural scope

This specification defines the production Docker Compose multi-container topology, network segmentation, volume persistence, resource allocations, container runtime security, and Caddy ingress routing rules for LifeOS.

In accordance with [ADR-011](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-011-MAIN-SITE-LIFEOS-BOUNDARY.md), [docs/35-VPS-INVENTORY-AND-HARDENING.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/35-VPS-INVENTORY-AND-HARDENING.md), [docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md), and [docs/37-PRODUCTION-CONTAINERS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/37-PRODUCTION-CONTAINERS.md), LifeOS operates inside containerized application boundaries behind an edge Caddy reverse proxy on the 4GB VPS host.

This document establishes the production Compose standard (`life-os/infra/compose/compose.prod.yml`) and Caddy ingress routing configuration (`life-os/infra/caddy/Caddyfile.prod` and `deploy/caddy/Caddyfile`).

---

## 2. Multi-container service topology

The production deployment consists of four primary container services managed via Docker Compose:

| Service Name | Container Image | Internal Port | Description & Responsibilities |
| --- | --- | --- | --- |
| `caddy` | `caddy:2.9.1-alpine` | `80`, `443` | Edge reverse proxy, TLS termination, path routing, rate limiting, and security header enforcement. |
| `web` | Custom `life-os-web:prod` (`nginx:1.27.4-alpine`) | `8080` | Static asset Nginx server serving the React SPA bundle and SPA route fallbacks for `/life-os/*`. |
| `api` | Custom `life-os-api:prod` (`eclipse-temurin:21-jre-alpine`) | `8080` | Backend Spring Boot Java application serving business logic and REST APIs under `/life-os/api/v1/*`. |
| `postgres` | `postgres:18.4-alpine` | `5432` | Production PostgreSQL relational database storing LifeOS application domain data. |

---

## 3. Network segmentation & network isolation

Services are segmented into isolated Docker overlay/bridge networks to enforce strict network-level access boundaries:

```
                  +---------------------------------------------------+
                  |                 Public Internet                   |
                  +-------------------------+-------------------------+
                                            | (80 / 443)
                                            v
                  +---------------------------------------------------+
                  |                   caddy service                   |
                  +------------+-------------------------+------------+
                               |                         |
               (frontend-net)  |                         | (backend-net)
                               v                         v
                  +------------------------+ +------------------------+
                  |      web service       | |      api service       |
                  |     (React / Nginx)    | |     (Spring Boot)      |
                  +------------------------+ +-----------+------------+
                                                         |
                                                         | (db-net)
                                                         v
                                             +------------------------+
                                             |    postgres service    |
                                             |     (PostgreSQL 18.4)  |
                                             +------------------------+
```

### Network Definitions:
1. `frontend-net`: Shared network between `caddy` and `web` for static frontend asset proxying.
2. `backend-net`: Shared network between `caddy` and `api` for API HTTP request proxying.
3. `db-net`: Private backend network between `api` and `postgres`. `caddy` and `web` have zero network access to `postgres`. `postgres` port `5432` is not published to host or public interfaces.

---

## 4. Volume persistence & storage model

1. **PostgreSQL Named Volume**:
   - `lifeos-prod-postgres-data`: Persistent volume for PostgreSQL `/var/lib/postgresql/data`.
   - Host path managed by Docker Engine engine drivers, strictly decoupled from ephemeral container filesystems.
2. **Ephemeral Write Storage (`tmpfs`)**:
   - Containers mount memory-backed `tmpfs` volumes for `/tmp`, `/var/cache`, and `/var/run` to allow read-only root filesystems (`read_only: true`).

---

## 5. Resource boundaries & allocation limits (4GB VPS Allocation)

To preserve host OS stability on the 4GB VPS ([docs/35-VPS-INVENTORY-AND-HARDENING.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/35-VPS-INVENTORY-AND-HARDENING.md)), containers enforce explicit CPU and memory quotas:

| Service | CPU Limit | Memory Limit | CPU Reservation | Memory Reservation | Rationale |
| --- | --- | --- | --- | --- | --- |
| `api` | `1.50` | `1536M` | `0.25` | `512M` | Spring Boot JVM heap allocation & background job processing. |
| `postgres` | `1.00` | `1024M` | `0.20` | `256M` | PostgreSQL shared buffers, work memory, and connection pools. |
| `web` | `0.50` | `256M` | `0.05` | `64M` | Static Nginx asset serving and Gzip/Zstd compression. |
| `caddy` | `0.50` | `256M` | `0.05` | `64M` | Edge reverse proxy, TLS termination, and log buffering. |
| **Total Allocations** | **3.50 vCPU** | **3072MB RAM** | **0.55 vCPU** | **896MB RAM** | Leaves ~1GB RAM & CPU capacity reserved for host OS & backup utilities. |

---

## 6. Container runtime security & health checks

All services operate under least-privilege runtime security profiles:

1. **Least-Privilege Non-Root Execution**:
   - `USER 10001` (`lifeos-app`) enforced in `api` and `web`.
   - Dedicated unprivileged runtime system accounts in `postgres` and `caddy`.
2. **Read-Only Root Filesystems**:
   - `read_only: true` enabled on `api`, `web`, and `caddy`.
3. **Capability & Escalation Restrictions**:
   - `cap_drop: ALL` drops Linux capabilities.
   - `no-new-privileges: true` blocks setuid privilege escalation.
4. **Health Monitoring & Auto-Restart**:
   - `api` health check probe: `wget http://127.0.0.1:8080/life-os/api/v1/actuator/health`.
   - `web` health check probe: `wget http://127.0.0.1:8080/healthz`.
   - `postgres` health check probe: `pg_isready -U lifeos_app -d lifeos_prod`.
   - `caddy` health check probe: `caddy version` / admin API check.
   - Container restart policy: `restart: unless-stopped`.

---

## 7. Caddy ingress routing specification

Caddy functions as the primary edge reverse proxy for domain `buildwithpartha.tech`.

### Route Order & Matching Matrix:

1. **LifeOS API (`/life-os/api/*`)**:
   - Reverse proxies to `http://api:8080`.
   - Preserves original client IP (`X-Forwarded-For`, `X-Real-IP`, `X-Forwarded-Proto`).
   - Rate limit: 100 requests / minute per client IP.
   - Request body limit: `10MB`.

2. **LifeOS Web SPA (`/life-os/*`)**:
   - Reverse proxies to `http://web:8080`.
   - Web container Nginx handles SPA fallback to `/life-os/index.html`.

3. **Main Site Root (`/` & static assets)**:
   - Serves static coming-soon / primary website files from `/var/www/buildwithpartha/site`.
   - Fallback to `/index.html`.

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

### Compression & Logging:
- HTTP response compression enabled using `zstd` and `gzip`.
- Access logs output in structured JSON format to stdout/file for safe rotation and correlation search ([LOS-1611](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)).

---

## 8. Secrets injection & environment file policy

Environment variables and credentials are injected into Docker Compose via `env_file` directives referencing `/etc/life-os/secrets/.env.production` per [docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md).

Secrets files on the VPS are owned by `lifeos-deploy` with permissions `0600`. Zero credentials are committed to version control.

---

## 9. Automated verification

Production Compose and Caddy configurations are validated via automated script:
`sh life-os/scripts/validate-production-compose.sh --dry-run`

The validator enforces static assertions on:
1. Production Compose syntax and structure (`compose.prod.yml`).
2. Private network declarations (`frontend-net`, `backend-net`, `db-net`).
3. Persistent volume mounting for PostgreSQL.
4. Non-root user settings (`USER 10001`), capability drops, and read-only flags.
5. Resource allocations (`limits` & `reservations`).
6. Caddyfile route ordering (`/life-os/api/*`, `/life-os/*`, `/`).
7. Security headers and SPA fallback presence.
