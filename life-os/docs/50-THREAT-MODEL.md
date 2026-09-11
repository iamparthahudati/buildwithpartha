# 50. STRIDE Threat Model and Security Architecture

## Overview

LifeOS is an owner-centered personal operating system deployed under `buildwithpartha.tech/life-os`. The application processes highly sensitive personal productivity data—including projects, tasks, focus sessions, time tracking, habits, daily/weekly review snapshots, brain dumps, and uploaded attachments.

This document formalizes the **STRIDE Threat Model** across all nine system boundaries for LifeOS, mapping each threat to its architectural defense, mitigation owner, and automated/manual verification suite as required by **LOS-1506** and **EPIC-15**.

---

## System Architecture & Trust Boundaries

The LifeOS architecture is structured into distinct trust zones separated by cryptographic and logical trust boundaries:

```
[ User Browser / Device ] (Untrusted / Client Environment)
       │ (HTTPS / TLS 1.3)
       ▼
[ Cloudflare Edge ] (Edge WAF, DDoS Mitigation, Edge TLS Termination)
       │ (Authenticated Strict Origin TLS)
       ▼
[ VPS Host: Caddy Reverse Proxy ] (Host TLS, Security Headers, Static Routing)
       │ (Internal Loopback / Docker Network)
       ▼
[ Spring Boot 4 REST API ] (Application Security, Authentication Filter, Scoped Authorization)
       ├──► [ PostgreSQL 17 Database ] (Internal Docker Network, Least-Privilege DB User)
       ├──► [ Local Attachment Storage ] (Isolated Storage Directory, Restricted Permissions)
       └──► [ Transactional Email (SES/SMTP) ] (TLS 1.3, Ephemeral One-Time Tokens)
```

### Trust Boundary Definitions

1. **Trust Boundary 1 (Client to Edge)**: Public internet traffic traversing from untrusted user devices through Cloudflare edge proxy.
2. **Trust Boundary 2 (Edge to VPS / Reverse Proxy)**: Cloudflare proxy to VPS Caddy reverse proxy via Full (Strict) TLS.
3. **Trust Boundary 3 (Reverse Proxy to Application Server)**: Caddy to Spring Boot container over isolated internal network interface.
4. **Trust Boundary 4 (Application Server to Persistence)**: Spring Boot JPA repositories to PostgreSQL container over private Docker network.
5. **Trust Boundary 5 (Application Server to Disk Storage)**: Spring Boot attachment/export services to host filesystem volume.
6. **Trust Boundary 6 (Application Server to Email Gateway)**: Spring Boot mail adapter to transactional email provider over TLS.
7. **Trust Boundary 7 (Client-Side Storage)**: Browser IndexedDB, Web Storage, and CacheStorage within origin sandbox.

---

## STRIDE Threat Analysis by Boundary

The threat model evaluates six primary threat categories:
- **S**poofing identity
- **T**ampering with data
- **R**epudiation
- **I**nformation disclosure
- **D**enial of service
- **E**levation of privilege

---

### 1. Auth, Identity & Session Management

| STRIDE | Threat Description | Severity | Mitigation Strategy | Owner | Verification / Test Suite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S** | Session Hijacking via Stolen Cookie | High | `lifeos_session` cookie issued with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, scoped to application origin. Only token hash is stored in DB. | Backend Eng | `IdentitySecurityGateIntegrationTests`, `ThreatModelSecurityIntegrationTests` (TM-S-1, TM-S-2) |
| **S** | Credential Stuffing / Brute-Force Login | High | Password hashing via Argon2id (memory-hard, resistant to GPU attacks). Rate limiting on `/auth/login` and `/auth/signup`. | Backend Eng | `IdentitySecurityGateIntegrationTests`, `PasswordPolicyTests` |
| **T** | CSRF / Session Tampering on Mutations | High | Dual-token anti-CSRF architecture: state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require `X-CSRF-TOKEN` header matching server-issued hash. | Backend Eng | `ThreatModelSecurityIntegrationTests` (TM-T-1), `IdentitySecurityGateIntegrationTests` |
| **R** | Repudiation of Account Deletion / Actions | Med | Immutable security audit logging on login, password change, session revocation, and account deletion requests with correlation IDs and timestamps. | Backend Eng | `SecurityAuditServiceTests`, `ThreatModelSecurityIntegrationTests` (TM-R-1) |
| **I** | Account Existence Enumeration via Timing / Errors | Med | Constant-time password verification and uniform error responses (`INVALID_CREDENTIALS` / `401 Unauthorized`) for existing and non-existing accounts. | Backend Eng | `ThreatModelSecurityIntegrationTests` (TM-I-4), `AuthControllerTests` |
| **E** | Session Fixation Attack | High | Fresh session token and CSRF secret generated on every successful login; pre-existing cookies are invalidated and replaced. | Backend Eng | `IdentitySecurityGateIntegrationTests`, `SessionManagementServiceTests` |

---

### 2. API & REST Surface

| STRIDE | Threat Description | Severity | Mitigation Strategy | Owner | Verification / Test Suite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **I** | Insecure Direct Object Reference (IDOR) | High | Every JPA repository query includes `userId = :userId`. Foreign resource IDs return `404 RESOURCE_NOT_FOUND` indistinguishable from non-existent entities. | Backend Eng | `CrossUserAuthorizationMatrixIntegrationTests` (21 tests), `ThreatModelSecurityIntegrationTests` (TM-I-3) |
| **T** | Cross-Tenant Parameter Reference Tampering | High | Foreign key references (e.g., assigning a `projectId` or `labelIds` to a task) are validated against current `userId`. Cross-user assignments rejected with `400 BAD_REQUEST`. | Backend Eng | `CrossUserAuthorizationMatrixIntegrationTests`, `ThreatModelSecurityIntegrationTests` (TM-T-2) |
| **I** | Actuator Information Disclosure | High | Public exposure strictly restricted to aggregate `/actuator/health/liveness` and `/readiness`. Internal endpoints (`/env`, `/heapdump`, `/beans`) denied (`401/403`). | Platform Eng | `ThreatModelSecurityIntegrationTests` (TM-I-1, TM-I-2), `06-SECURITY.md` |
| **I** | Stack Trace / SQL Leakage in Errors | Med | Uniform RFC 7807 `ProblemDetail` handler prevents leakage of exception classes, SQL state, stack traces, or internal paths to clients. | Backend Eng | `GlobalExceptionHandlerTests`, `IdentitySecurityGateIntegrationTests` |
| **T** | Header Injection / Malicious Correlation ID | Low | `X-Correlation-Id` header is length-bounded and regex-sanitized to alphanumeric characters before inclusion in logs or response headers. | Backend Eng | `ThreatModelSecurityIntegrationTests` (TM-R-1) |

---

### 3. Database & Persistence Layer

| STRIDE | Threat Description | Severity | Mitigation Strategy | Owner | Verification / Test Suite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T** | SQL Injection (SQLi) | High | 100% parameterized SQL via Spring Data JPA and Hibernate Type mappings. Zero dynamic raw SQL concatenation. | Backend Eng | `PackageBoundaryRulesTests`, Spring Data integration test suite |
| **I** | Direct DB Access via Network Exposure | High | PostgreSQL listens exclusively on internal loopback / private Docker bridge network. No external ports mapped on VPS firewall. | Platform Eng | `35-VPS-INVENTORY-AND-HARDENING.md`, `verify-vps-hardening.sh` |
| **I** | Unauthorized DB Access via DB Role Escalation | High | Application connects via dedicated least-privilege role (`lifeos_app`) with schema-specific DML permissions. | Platform Eng | `36-PRODUCTION-CONFIGURATION-AND-SECRETS.md`, `validate-production-secrets.sh` |
| **T** | Concurrent Mutation Race / Lost Updates | Med | Optimistic locking via `@Version` fields on all mutable root aggregate entities. | Backend Eng | `OptimisticConcurrencyIntegrationTests` |
| **I** | Plaintext Backup Exposure | High | Daily automated PostgreSQL dumps encrypted with GPG/AES-256 before disk storage or offsite archival; storage permissions set to `600`. | Platform Eng | `backup-postgres.sh`, `validate-postgres-backups.sh` |

---

### 4. File Attachments & Upload Pipeline

| STRIDE | Threat Description | Severity | Mitigation Strategy | Owner | Verification / Test Suite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T** | Stored XSS / Remote Code Execution via Upload | High | Strict MIME whitelist (`image/jpeg`, `png`, `webp`, `gif`, `pdf`, `text/plain`, `markdown`, Office docs). Executables (`.exe`, `.sh`, `.bat`, `.html`, `.svg`) rejected. Magic bytes validation. | Backend Eng | `AttachmentMimeValidatorTests`, `ThreatModelSecurityIntegrationTests` (TM-D-1) |
| **T** | Path Traversal File Overwrite | High | Uploaded files stored on disk under randomly generated UUID keys (`storageKey`), never user-supplied file paths. Filenames sanitized. | Backend Eng | `AttachmentMimeValidatorTests`, `AttachmentInfrastructureTests` |
| **D** | Disk Storage Exhaustion (DoS) | Med | Strict quotas: 10 MB per-file size limit and 100 MB per-account aggregate quota enforced prior to disk write. | Backend Eng | `AttachmentQuotasTests`, `AttachmentServiceTests` |
| **I** | Cross-User Attachment Download (IDOR) | High | File download endpoints authenticate user and verify attachment ownership before streaming binary bytes. Downloads served with `X-Content-Type-Options: nosniff`. | Backend Eng | `AttachmentDownloadServiceTests`, `CrossUserAuthorizationMatrixIntegrationTests` |

---

### 5. Mail & Transactional Notification Delivery

| STRIDE | Threat Description | Severity | Mitigation Strategy | Owner | Verification / Test Suite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T** | SMTP / CRLF Header Injection | Med | Email recipient addresses strictly normalized and validated against RFC 5322 regex; newlines and carriage returns stripped. | Backend Eng | `EmailAddressTests`, `SignupServiceTests` |
| **I** | Token Interception in Transit | High | Transactional emails sent exclusively over TLS 1.3. Reset tokens have 15-minute TTL; verification tokens have 24-hour TTL; tokens invalidated immediately upon single use. | Backend Eng | `EmailVerificationServiceTests`, `ResetPasswordServiceTests` |
| **I** | PII / Credential Leakage in Notification Copy | Low | Notification emails contain zero user passwords, session tokens, or personal notes. Unauthenticated open-tracking pixels and third-party trackers are prohibited. | Product / Eng | `31-PRIVACY-DATA-LIFECYCLE.md`, `30-CONTENT-AND-TONE-GUIDE.md` |

---

### 6. Cloudflare, Edge Proxy & Network Security

| STRIDE | Threat Description | Severity | Mitigation Strategy | Owner | Verification / Test Suite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T** | Man-in-the-Middle (MitM) / Eavesdropping | High | Cloudflare Full (Strict) TLS mode with TLS 1.3 enforced. Origin protected by Caddy TLS certificate. Strict Transport Security (HSTS) with 1-year max-age and preload. | Platform Eng | `40-CLOUDFLARE-DNS-PROXY-AND-TLS.md`, `validate-cloudflare-configuration.sh` |
| **D** | Distributed Denial of Service (DDoS) | High | Cloudflare Edge DDoS mitigation, WAF Managed Rules, Rate Limiting Rules, and Bot Fight Mode enabled. | Platform Eng | `40-CLOUDFLARE-DNS-PROXY-AND-TLS.md` |
| **I** | Origin IP Direct Bypass | High | VPS UFW firewall restricts inbound TCP ports 80/443 strictly to Cloudflare IP ranges. Direct origin IP connections are dropped. | Platform Eng | `35-VPS-INVENTORY-AND-HARDENING.md`, `verify-vps-hardening.sh` |
| **T** | Clickjacking / Content Framing | Med | Caddy and Cloudflare inject `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'`. | Frontend / Ops | `38-PRODUCTION-COMPOSE-AND-CADDY.md`, `06-SECURITY.md` |

---

### 7. Offline Cache, IndexedDB & Service Worker

| STRIDE | Threat Description | Severity | Mitigation Strategy | Owner | Verification / Test Suite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **I** | Credential Exposure in Browser Storage | High | Zero passwords, session cookies, or CSRF tokens stored in IndexedDB or LocalStorage. Storage restricted to offline draft tasks and transient UI cache. | Frontend Eng | `14-OFFLINE-SYNC.md`, `31-PRIVACY-DATA-LIFECYCLE.md` |
| **T** | Offline Mutation Replay Attack / Conflict | Med | Offline mutation queue attaches client-generated idempotency UUIDs and version tokens (`Idempotency-Key`, `version`) to prevent duplicate execution or state overwrite. | Frontend Eng | `14-OFFLINE-SYNC.md`, `offline-sync-queue.spec.ts` |
| **I** | Shared Device Data Residuals after Logout | High | Explicit logout triggers complete purge of client-side IndexedDB databases, CacheStorage stores, and in-memory caches before redirection. | Frontend Eng | `IdentitySecurityGateIntegrationTests`, `auth-flow.spec.ts` |

---

### 8. Exports, Reports & Data Portability

| STRIDE | Threat Description | Severity | Mitigation Strategy | Owner | Verification / Test Suite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T** | CSV / Spreadsheet Formula Injection | High | CSV export service sanitizes cell values starting with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending a single quote (`'`). | Backend Eng | `CsvExportServiceTests`, `ThreatModelSecurityIntegrationTests` (TM-D-2) |
| **I** | Cross-User Data Export Interception (IDOR) | High | Export archive generation runs under authenticated user context and queries only records owned by `userId`. Archive downloads require authenticated session. | Backend Eng | `AccountExportContributorTests`, `DataExportServiceTests` |
| **D** | Export Resource Exhaustion (DoS) | Med | Export generation is rate-limited and executed asynchronously; temporary archives deleted automatically after 1-hour expiration. | Backend Eng | `ExportFileCleanupJobTests`, `ExportDownloadServiceTests` |

---

### 9. Admin, VPS, Containers & Operations

| STRIDE | Threat Description | Severity | Mitigation Strategy | Owner | Verification / Test Suite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **E** | Superuser / God-Mode Account Compromise | High | Architecture has no "super-admin" or global tenant bypass in application code. All operations are strictly single-tenant scoped. | Architecture / Eng | `02-ARCHITECTURE.md`, `46-CROSS-USER-AUTHORIZATION-MATRIX.md` |
| **E** | Container Breakout / Root Privilege Escalation | High | Containers run as non-root unprivileged users (`UID 10001`), with read-only root filesystems where practical, and Docker socket unmapped. | Platform Eng | `37-PRODUCTION-CONTAINERS.md`, `validate-container-builds.sh` |
| **I** | Secret Exposure via Git / Source Code | High | Zero production secrets committed to repository. CI/CD uses environment injection; secret scanning enforced on all branches. | DevOps / Eng | `validate-production-secrets.sh`, `LifeOS / Secret scan` CI check |
| **I** | PII / Credential Leakage in Application Logs | Med | Logback formatters automatically redact passwords, session tokens, authorization headers, and sensitive note content. | Backend Eng | `06-SECURITY.md`, `31-PRIVACY-DATA-LIFECYCLE.md` |

---

## High-Risk Mitigation & Verification Ledger

Every identified **High** or **Critical** risk has a documented Owner, Mitigation Strategy, and Automated Test Suite:

| Risk ID | Threat Vector | STRIDE | Severity | Mitigation Architecture | Owner | Verification Test Suite |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HR-01** | Cross-User IDOR Access | I | High | User-scoped repository queries + indistinguishable 404 responses | Backend Eng | `CrossUserAuthorizationMatrixIntegrationTests` (21 tests), `ThreatModelSecurityIntegrationTests` (TM-I-3) |
| **HR-02** | Session Hijacking & Fixation | S, E | High | `HttpOnly`, `Secure`, `SameSite=Lax` cookies; SHA-256 hashed storage; fresh session tokens on login | Backend Eng | `IdentitySecurityGateIntegrationTests`, `ThreatModelSecurityIntegrationTests` (TM-S-1, TM-S-3) |
| **HR-03** | Cross-Site Request Forgery (CSRF) | T | High | Mandatory `X-CSRF-TOKEN` header validation on all mutations | Backend Eng | `ThreatModelSecurityIntegrationTests` (TM-T-1), `IdentitySecurityGateIntegrationTests` |
| **HR-04** | Actuator Internal Exposure | I | High | Lock down all actuator paths except public `/health/liveness` and `/health/readiness` | Platform Eng | `ThreatModelSecurityIntegrationTests` (TM-I-1, TM-I-2) |
| **HR-05** | Direct Origin Bypass | I, T | High | UFW firewall restricts inbound traffic to Cloudflare IP ranges | Platform Eng | `verify-vps-hardening.sh`, `validate-cloudflare-configuration.sh` |
| **HR-06** | Dangerous File Upload (RCE/XSS) | T | High | MIME whitelist, magic bytes validation, unexecutable extensions, UUID storage keys | Backend Eng | `AttachmentMimeValidatorTests`, `ThreatModelSecurityIntegrationTests` (TM-D-1) |
| **HR-07** | CSV Formula Injection | T | High | Prepend single quote `'` to formula triggers (`=`, `+`, `-`, `@`) | Backend Eng | `CsvExportServiceTests`, `ThreatModelSecurityIntegrationTests` (TM-D-2) |
| **HR-08** | Database Network Exposure | I | High | PostgreSQL bound only to internal Docker bridge; least-privilege `lifeos_app` user | Platform Eng | `validate-production-compose.sh`, `verify-vps-hardening.sh` |
| **HR-09** | Secret Leakage in Repo | I | High | Gitleaks / secret scanning in CI; `.env.production` on host with `600` permissions | DevOps / Eng | `validate-production-secrets.sh`, CI Secret Scan |
| **HR-10** | Cross-Tenant Reference Tampering | T | High | Explicit foreign key ownership validation across all entity relationships | Backend Eng | `DefaultProjectOwnershipValidator`, `ThreatModelSecurityIntegrationTests` (TM-T-2) |

---

## Operational Incident Response

1. **Compromised Account / Token**:
   - User or admin can trigger `/auth/sessions/revoke-others` or `/auth/logout` to revoke all active sessions.
   - Password reset immediately revokes all existing sessions across all devices.
2. **Origin Security Incident**:
   - Cloudflare "Under Attack Mode" can be toggled instantly to challenge all inbound traffic.
   - UFW firewall rules can drop all non-Cloudflare traffic without application downtime.
3. **Backup Recovery & Integrity**:
   - GPG-encrypted PostgreSQL dumps are restored according to `42-POSTGRESQL-BACKUP-AND-RESTORE.md` into isolated test containers before production deployment.

---

## Conclusion

The LifeOS threat model confirms that all identified high and critical risks across authentication, API routing, persistence, file handling, email delivery, Cloudflare edge, offline caching, data export, and infrastructure operations are fully mitigated by architectural controls and validated through continuous automated integration tests.
