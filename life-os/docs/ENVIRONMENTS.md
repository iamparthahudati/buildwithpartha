# LifeOS environment inventory

No secret values belong in this document.

| Environment | Purpose | UI/API | Data | Access and owner |
| --- | --- | --- | --- | --- |
| Local | Individual development and fast tests | UI `http://localhost:5173/life-os/`; API through same-origin local gateway at `/life-os/api/v1` | Disposable PostgreSQL volume and deterministic fixtures; local mail catcher | Developer machine; Partha |
| Test/CI | Automated isolated verification | Ephemeral internal URLs | Fresh PostgreSQL container per suite/job; synthetic data only | CI workload identity; repository owner |
| Staging | Production-like release, migration and security validation | `https://staging.buildwithpartha.tech/life-os`; API `/life-os/api/v1` | Separate database, storage, mail sandbox and secrets; synthetic test users only | Restricted owner/test access; Partha |
| Production | Real LifeOS private application | `https://buildwithpartha.tech/life-os`; API `/life-os/api/v1` | Real private user data in VPS PostgreSQL/private object store if enabled | Cloudflare -> hardened VPS; Partha |

## Separation rules

- No environment shares database, volume, encryption/signing key, session secret, SMTP credentials, object bucket/prefix or backup namespace with production.
- Production data is not copied to local, CI or staging by default. Any future diagnostic copy requires a documented, minimized and sanitized process with deletion deadline.
- Test/staging email uses a mail catcher or provider sandbox and cannot deliver to arbitrary real recipients.
- Browser builds contain only public configuration. Backend secrets exist only in environment/secret stores.
- Cloudflare production rules and origin credentials are distinct from staging where the provider supports it.
- Local convenience settings such as insecure cookies cannot be accepted in staging/production profiles.

## Configuration classes

### Public frontend values

- application base path and API base path;
- release/version identifier;
- explicitly public feature flags and support/legal links.

These values are not secrets and may appear in the client bundle.

### Backend secrets

- database password;
- session/token pepper or signing/encryption material as selected;
- SMTP credentials;
- object-storage credentials when enabled;
- monitoring/alert credentials;
- backup encryption and destination credentials;
- Cloudflare deploy/origin credentials where automation requires them.

### Backend non-secret configuration

- public URL and trusted proxy/origin settings;
- session duration/cookie policy;
- rate limits and quotas;
- mail sender/domain;
- job schedules, retention periods and feature flags;
- logging/metrics endpoints without credentials.

## Startup validation contract

- Frontend development and production builds require `VITE_APP_BASE_PATH` and `VITE_API_BASE_PATH`. Both are public, absolute paths; the API path must remain beneath the application's `/api` boundary.
- Backend runtime startup requires the active profile, server port, runtime and Flyway database connections/credentials, public URL, secure-cookie decision, mail sender, and SMTP host/port listed in `apps/api/.env.example`.
- Blank values fail like missing values. Ports, URLs, paths, cookie booleans, JDBC schemes, and sender addresses also receive shape validation before dependent services start.
- Test profiles use committed deterministic non-secret configuration so unit, context, and build tests do not require developer or production secrets.
- Validation errors list only missing or invalid key names. They never echo configuration values, credentials, connection strings, or URL contents.
- `.env.example` files contain local-only safe examples. Developers copy them to ignored local files or source them; staging and production obtain distinct values from their future secret/configuration stores.

## Ownership and readiness

| Area | Owner | Must be resolved by |
| --- | --- | --- |
| Stable dependency versions | Engineering owner | Resolved by LOS-0203; future changes follow `DEPENDENCY-POLICY.md` |
| Local PostgreSQL port and Compose names | Engineering owner | Resolved by LOS-0204: loopback `55432`, project `life-os-local` |
| Local same-origin UI/API gateway ports | Engineering owner | Resolved by LOS-0210: browser/Vite `5173`, API upstream `8080`, preview `4173` |
| Frontend/backend startup validation and safe examples | Engineering owner | Resolved by LOS-0211; later feature tickets extend the required-key inventory |
| Production secrets & configuration | Partha | Resolved by LOS-1602: Inventory, 256-bit generation standards, filesystem permissions (0600), staging separation, rotation policies, non-logging validation contract; see [`36-PRODUCTION-CONFIGURATION-AND-SECRETS.md`](./36-PRODUCTION-CONFIGURATION-AND-SECRETS.md) |
| Production container packaging & hardening | Engineering owner | Resolved by LOS-1603: Multi-stage pinned images (Temurin JRE / Node / Nginx Alpine), non-root user (10001), Actuator/Nginx health probes, read-only FS compatibility, drop capabilities, SBOM & reproducible builds; see [`37-PRODUCTION-CONTAINERS.md`](./37-PRODUCTION-CONTAINERS.md) |
| Production Compose & Caddy routing | Engineering owner | Resolved by LOS-1604: Multi-container topology (caddy, web, api, postgres), network isolation (frontend-net, backend-net, db-net), volume persistence, resource boundaries, Caddy ingress path routing matrix, security headers, request limits & JSON logging; see [`38-PRODUCTION-COMPOSE-AND-CADDY.md`](./38-PRODUCTION-COMPOSE-AND-CADDY.md) |
| Staging hostname and access | Partha | Resolved by LOS-1605: Dedicated domain `staging.buildwithpartha.tech`, isolated multi-container stack (`caddy-staging`, `web-staging`, `api-staging`, `postgres-staging`), private networks (`staging-frontend-net`, `staging-backend-net`, `staging-db-net`), volume persistence (`lifeos-staging-postgres-data`), resource quotas (1.5GB RAM ceiling for VPS co-existence), mail sandbox policy, synthetic data, `X-Robots-Tag` noindex header & `.env.staging` secrets injection; see [`39-STAGING-ENVIRONMENT.md`](./39-STAGING-ENVIRONMENT.md) |
| VPS OS/resources/deploy user | Partha | Resolved by LOS-1601: Ubuntu 24.04 LTS, 2 vCPU / 4 GB RAM / 80 GB NVMe, `lifeos-deploy` user, SSH key-only auth, UFW, fail2ban, time sync; see [`35-VPS-INVENTORY-AND-HARDENING.md`](./35-VPS-INVENTORY-AND-HARDENING.md) |
| Cloudflare zone/API/origin path | Partha | LOS-1606 |
| SMTP provider/sending domain | Partha | Before LOS-0503 staging verification |
| Backup destination/retention/RPO/RTO | Partha | LOS-1608 |
| Monitoring/alert destination | Partha | LOS-1610 |

## Secret lifecycle

Each production/staging secret needs owner, purpose, environment, creation date, storage location, consumers, rotation method, last/next rotation, revocation procedure and incident contact. Rotation must support overlap where zero-downtime consumers require it. Logs and deployment output never print values.

## Data retention summary

- Local/CI: disposable; clear after task/job unless retained temporarily for a named failing test.
- Staging: synthetic; resettable; attachments/exports/jobs follow short test retention.
- Production: follows privacy/data lifecycle, audit, export, deletion and backup policies approved in dedicated tickets.
