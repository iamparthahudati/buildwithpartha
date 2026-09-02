# LifeOS production configuration and secrets specification

- Status: Accepted
- Date: 2026-09-03
- Ticket: [LOS-1602](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-1601](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/35-VPS-INVENTORY-AND-HARDENING.md), [LOS-0211](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/handoffs/LOS-0211.md)

---

## 1. Overview and scope

This document defines the canonical production and staging configuration & secrets management specification for LifeOS.

In accordance with [ENVIRONMENTS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/ENVIRONMENTS.md), [ADR-011](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-011-MAIN-SITE-LIFEOS-BOUNDARY.md), and [LOS-0211](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/handoffs/LOS-0211.md), LifeOS strictly separates non-secret runtime configuration from confidential secrets across environments. This specification covers inventory listing, sensitivity classification, cryptographically secure generation standards, storage/filesystem permissions, staging environment isolation, routine and emergency secret rotation policies, non-logging validation contracts, and backup recovery material security.

---

## 2. Configuration & secrets inventory

| Environment Variable | Category | Scope | Sensitivity Level | Description & Requirements |
| --- | --- | --- | --- | --- |
| `VITE_APP_BASE_PATH` | Frontend | Web / Browser | Public | Absolute URL path prefix for SPA (`/life-os/`) |
| `VITE_API_BASE_PATH` | Frontend | Web / Browser | Public | Absolute URL path prefix for API gateway (`/life-os/api/v1`) |
| `SPRING_PROFILES_ACTIVE` | Backend | API Runtime | Non-Secret Config | Active Spring profile (`production` or `staging`) |
| `SERVER_PORT` | Backend | API Runtime | Non-Secret Config | Internal application HTTP listen port (`8080`) |
| `APP_PUBLIC_URL` | Backend | API Runtime | Non-Secret Config | Public canonical origin URL (`https://buildwithpartha.tech/life-os`) |
| `APP_SESSION_COOKIE_SECURE` | Backend | API Runtime | Non-Secret Config | Boolean flag enforcing `Secure` attribute on cookies (`true` in prod/staging) |
| `APP_MAIL_FROM` | Backend | API Runtime | Non-Secret Config | Sender email address for system notifications |
| `SMTP_HOST` | Backend | API Runtime | Non-Secret Config | SMTP outbound relay hostname |
| `SMTP_PORT` | Backend | API Runtime | Non-Secret Config | SMTP outbound relay port (`587` or `465`) |
| `DATABASE_URL` | Backend | API Runtime | Confidential Secret | PostgreSQL JDBC URL for application pooled connection |
| `DATABASE_USERNAME` | Backend | API Runtime | Confidential Secret | Application database role (`lifeos_app`) |
| `DATABASE_PASSWORD` | Backend | API Runtime | Confidential Secret | High-entropy password for application database user |
| `FLYWAY_DATABASE_URL` | Backend | API Migrator | Confidential Secret | PostgreSQL JDBC URL for Flyway migration connection |
| `FLYWAY_DATABASE_USERNAME` | Backend | API Migrator | Confidential Secret | DDL migrator database role (`lifeos_migrator`) |
| `FLYWAY_DATABASE_PASSWORD` | Backend | API Migrator | Confidential Secret | High-entropy password for database migrator user |
| `APP_SESSION_SECRET` | Backend | API Auth | Confidential Secret | High-entropy HMAC signing key / pepper for sessions & tokens |
| `SMTP_USERNAME` | Backend | API Mail | Confidential Secret | Authenticated SMTP provider account username |
| `SMTP_PASSWORD` | Backend | API Mail | Confidential Secret | Authenticated SMTP provider secret key / password |
| `BACKUP_ENCRYPTION_PASSPHRASE` | Infrastructure | Host / Cron | Master Recovery Secret | 256-bit symmetric key for encrypting DB dumps and object backups |
| `CLOUDFLARE_API_TOKEN` | Infrastructure | Deploy / DNS | Confidential Secret | Scoped API token for DNS/TLS/WAF automation (LOS-1606) |
| `MONITORING_API_TOKEN` | Infrastructure | Monitoring | Confidential Secret | Token for uptime monitor / status push (LOS-1610) |

---

## 3. Classification scheme & sensitivity levels

1. **Public Values (`Public`)**:
   - Values exposed to web browsers or client bundles.
   - May be committed in source control `.env.example` templates.
   - Contain zero credentials, security tokens, or private endpoints.

2. **Private Non-Secret Config (`Non-Secret Config`)**:
   - Infrastructure endpoints, ports, profile names, retention windows, and feature flags.
   - Required at runtime for application routing and configuration.
   - Safe to document in deployment templates, but must match host environment settings.

3. **Confidential Secrets (`Confidential Secret`)**:
   - Application database credentials, session signing keys/peppers, SMTP authentication credentials, and API tokens.
   - Must never appear in source code, client bundles, git history, or unredacted log streams.
   - Stored strictly in restricted filesystem locations on target VPS hosts.

4. **Master Recovery Secrets (`Master Recovery Secret`)**:
   - Symmetrically encrypted passphrases, root recovery material, and master encryption keys for database and asset backups.
   - Essential for cold-start disaster recovery. Must be archived out-of-band in an encrypted, multi-factor protected vault.

---

## 4. Secret generation standards & entropy policy

All confidential secrets and master recovery secrets generated for staging or production must adhere to strict cryptographic randomness guidelines:

1. **Entropy Requirements**:
   - Minimum entropy requirement: **256 bits (32 bytes)** of cryptographically secure random data.
   - Passwords and HMAC keys must be generated using `openssl rand -base64 32` or `openssl rand -hex 32`.

2. **Forbidden Values**:
   - Default values such as `password`, `admin`, `lifeos_local_app_only`, `secret`, `changeit`, or repeated character patterns are explicitly forbidden in production and staging environments.
   - Any secret matching committed local development defaults will cause startup validation to fail.

3. **Password & Hash Specifications**:
   - Argon2id parameter choices (LOS-0502): Memory `65536 KiB`, Iterations `3`, Parallelism `4`, Salt `16 bytes`, Key length `32 bytes`.

---

## 5. Storage location, permissions & filesystem policy

1. **VPS Directory & Filesystem Rules**:
   - Production secrets file location: `/etc/life-os/secrets/.env.production`
   - Staging secrets file location: `/etc/life-os/secrets/.env.staging`
   - Directory ownership: `lifeos-deploy:lifeos-deploy`
   - Directory permissions: `0700` (`drwx------`)
   - Secrets file permissions: `0600` (`-rw-------`)
   - Read/write access strictly limited to the `lifeos-deploy` user; world and group access forbidden (`chmod 600`).

2. **Docker Compose & Container Environment Injection**:
   - Environment variables are injected into container environments using Docker Compose `env_file` directives referencing `/etc/life-os/secrets/.env.production` (or Docker Secrets).
   - Containers run as non-root users (`lifeos-app`, uid 10001) with read-only root filesystems where applicable (LOS-1603).

3. **Version Control & Repository Exclusion**:
   - Environment files (`.env`, `.env.production`, `.env.staging`, `.env.local`) are explicitly gitignored in `.gitignore`.
   - CI automated secret scanning (LOS-0212) audits full commit history to prevent accidental commits of secret patterns.

---

## 6. Staging vs production environment separation

To enforce strict isolation and prevent accidental cross-environment data leakage:

1. **Zero Credential Sharing**:
   - Production and staging MUST NOT share any database password, database username, session signing key, SMTP credential, or backup passphrase.
   - Staging database URL connects to a distinct database instance (`lifeos_staging`) on a separate isolated volume or host.

2. **Staging Mail Trap / Sandbox**:
   - Staging outbound email is locked to a sandbox/mail-trap relay or test recipient domain (`@staging.buildwithpartha.tech`). Staging cannot deliver mail to real end users.

3. **Domain & Origin Isolation**:
   - Staging runs under a separate URL and Cloudflare worker/origin boundary.

---

## 7. Secret rotation policies & procedures

| Secret Class | Routine Rotation Interval | Trigger for Emergency Rotation | Rotation Strategy |
| --- | --- | --- | --- |
| Database Credentials | 90 days | Credential leak or staff off-boarding | Dual-user zero-downtime rotation (create new DB role, update app, drop old role) |
| Session / Auth Keys | 90 days | Suspected compromise or session breach | Overlapping key array (support key re-signing, graceful session invalidation) |
| SMTP Credentials | 180 days | Mail provider alert or credential leak | Generate new provider API key, update `.env.production`, restart API container |
| Backup Passphrases | 365 days | Backup destination compromise | Re-encrypt existing historical backup archives with new passphrase and store recovery material |
| API / Service Tokens | 180 days | Scoped token abuse or IP anomaly | Issue new scoped token via provider console, revoke old token |

### Emergency Rotation Runbook Summary:
1. Identify affected secret class and scope of exposure.
2. Generate fresh 256-bit replacement secret via `openssl rand -hex 32`.
3. Update target secret in `/etc/life-os/secrets/.env.production` with `0600` permissions.
4. Perform rolling service reload (`docker compose up -d --force-recreate api`).
5. Execute application health smoke check (`curl -f https://buildwithpartha.tech/life-os/api/v1/actuator/health`).
6. Revoke compromised secret from upstream provider/database.
7. Record rotation event in infrastructure audit ledger without logging secret values.

---

## 8. Ownership matrix & incident contact

| Role | Name | Responsibilities | Incident Contact |
| --- | --- | --- | --- |
| **System Owner & Admin** | Partha | Secret generation, VPS filesystem setup, vault backup, rotation approval | Primary On-Call |
| **Deployment Engine** | `lifeos-deploy` | Automated container execution, reading `/etc/life-os/secrets/` | Non-interactive Service |

---

## 9. Non-logging & startup validation contract

In accordance with [LOS-0211](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/handoffs/LOS-0211.md):

1. **Fail-Fast Validation**:
   - Application startup validates all required keys present in `LifeOsEnvironmentValidator`.
   - Missing or blank configuration keys immediately halt container startup with exit code 1.

2. **Strict Non-Logging Guarantee**:
   - Validation exception messages report **only missing key names** (e.g. `missing keys: DATABASE_PASSWORD, APP_SESSION_SECRET`).
   - Exception traces and application startup logs MUST NEVER print, log, or echo secret values, connection strings, or password strings under any circumstance.
   - Unit tests (`LifeOsEnvironmentValidatorTests.java`) explicitly test with sensitive inputs to prove values are redacted.

3. **Log Sanitization Compliance**:
   - HTTP access logs and application tracing (LOS-1611) redact sensitive headers (`Authorization`, `Cookie`, `Set-Cookie`, `X-CSRF-Token`).

---

## 10. Backup & master recovery material security

1. **Encrypted Backup Pipeline**:
   - Nightly database dumps (LOS-1608) and attachment archives (LOS-1609) are encrypted before off-site transmission using AES-256 (`gpg --symmetric --cipher-algo AES256`).
   - Symmetric key is derived from `BACKUP_ENCRYPTION_PASSPHRASE`.

2. **Master Recovery Material Storage**:
   - Master passphrases and decryption keys are stored **out-of-band** in a secure, encrypted password vault (e.g., Bitwarden / 1Password) with 2FA protection.
   - Master recovery secrets MUST NOT be stored unencrypted on the VPS or in repository code.

3. **Cold-Start Disaster Recovery**:
   - Disaster recovery runbook (LOS-1612) details downloading encrypted dumps, retrieving `BACKUP_ENCRYPTION_PASSPHRASE` from the out-of-band vault, decrypting the payload, and performing database restoration.

---

## 11. Automated verification

Compliance with this configuration & secrets specification is audited using the automated script:
`life-os/scripts/validate-production-secrets.sh`

The script executes static and environment audits for:
- Existence and completeness of `.env.example` templates in `apps/web` and `apps/api`.
- Git ignore enforcement for `.env`, `.env.production`, `.env.staging`, `.env.local`.
- Absence of committed hardcoded secrets in source files.
- Non-logging assertion compliance in `LifeOsEnvironmentValidator.java`.
- Filesystem permission compliance (`0600` / `0700`) for host secret paths when executed on a target VPS.
