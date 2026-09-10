# 44 — Backend Metrics and Alerts Contract

This document defines the production metrics, privacy label rules, Actuator scrape endpoints, and alert threshold contracts for LifeOS backend operations.

## 1. Overview and Privacy Guarantees

Observability metrics provide system health visibility without compromising user privacy.

> [!IMPORTANT]
> **Privacy Redaction Rule**: Metric tags MUST NOT contain P2 Private content or high-cardinality data.
> Prohibited tag values include: user IDs, email addresses, passwords, tokens, Task/Project titles, Note/Brain Dump content, search queries, raw request paths with path variables, and client IP addresses.
> All tag values are sanitized using `MetricsService.sanitizeTag(...)` to ensure low-cardinality, safe alphanumeric representations.

---

## 2. Metric Inventory

### 2.1 Authentication & Session Metrics

| Metric Name | Type | Description | Tags |
| --- | --- | --- | --- |
| `lifeos.auth.login.attempts` | Counter | Total login attempts | `result` (`SUCCESS`, `FAILURE`), `reason` (`NONE`, `INVALID_CREDENTIALS`, `RATE_LIMITED`) |
| `lifeos.auth.session.validations` | Counter | Session validation checks | `status` (`VALID`, `INVALID`, `EXPIRED`) |
| `lifeos.auth.password_reset.attempts` | Counter | Password reset requests | `result` (`SUCCESS`, `FAILURE`) |

### 2.2 Background Job Metrics

| Metric Name | Type | Description | Tags |
| --- | --- | --- | --- |
| `lifeos.job.executions` | Counter | Background job execution count | `kind` (`DATA_EXPORT`, `ACCOUNT_DELETION`, `ATTACHMENT_SCAN`, etc.), `status` (`SUCCESS`, `RETRY`, `DEAD_LETTER`) |
| `lifeos.job.duration` | Timer | Background job execution duration (ms) | `kind`, `status` (`SUCCESS`, `FAILURE`) |

### 2.3 HTTP API Metrics

| Metric Name | Type | Description | Tags |
| --- | --- | --- | --- |
| `lifeos.api.requests` | Counter | Ingress HTTP API request volume | `method` (`GET`, `POST`, `PUT`, `DELETE`), `status_class` (`2xx`, `3xx`, `4xx`, `5xx`), `uri_template` (`/life-os/api/v1/tasks/{id}`) |
| `lifeos.api.request.duration` | Timer | HTTP API response latency (ms) | `method`, `status_class`, `uri_template` |

### 2.4 Database Pool Metrics (HikariCP)

| Metric Name | Type | Description | Tags |
| --- | --- | --- | --- |
| `hikaricp.connections.active` | Gauge | Active connections currently in use | `pool` (`LifeOsPool`) |
| `hikaricp.connections.idle` | Gauge | Idle connections available in pool | `pool` (`LifeOsPool`) |
| `hikaricp.connections.pending` | Gauge | Threads waiting for connection | `pool` (`LifeOsPool`) |
| `hikaricp.connections.acquire` | Timer | Time taken to acquire connection | `pool` (`LifeOsPool`) |

### 2.5 Caching & Proxy Metrics

| Metric Name | Type | Description | Tags |
| --- | --- | --- | --- |
| `lifeos.cache.evaluations` | Counter | HTTP ETag and policy evaluations | `cache_name` (`etag`, `policy`), `result` (`HIT`, `MISS`, `BYPASS`, `REVALIDATED`) |

### 2.6 Mail Metrics

| Metric Name | Type | Description | Tags |
| --- | --- | --- | --- |
| `lifeos.mail.sends` | Counter | Transactional mail send attempts | `mail_type` (`VERIFICATION`, `PASSWORD_RESET`, `SECURITY_ALERT`), `status` (`SUCCESS`, `FAILURE`) |

### 2.7 Export Metrics

| Metric Name | Type | Description | Tags |
| --- | --- | --- | --- |
| `lifeos.export.generations` | Counter | Private user data export requests | `export_type` (`FULL_DATA_EXPORT`), `status` (`SUCCESS`, `FAILURE`) |
| `lifeos.export.duration` | Timer | Export generation duration (ms) | `export_type`, `status` |
| `lifeos.export.bytes` | Summary | Size of generated export archives (bytes) | `export_type` |

### 2.8 Business Health Metrics

| Metric Name | Type | Description | Tags |
| --- | --- | --- | --- |
| `lifeos.business.users.total` | Gauge | Total registered active users | None |
| `lifeos.business.tasks.total` | Gauge | Total non-deleted tasks | None |
| `lifeos.business.habits.total` | Gauge | Total active habit trackers | None |

---

## 3. Scrape and Actuator Endpoints

The Spring Boot Actuator endpoints are exposed under internal security boundaries:

- `GET /life-os/api/v1/actuator/health/liveness`: Kubernetes liveness probe.
- `GET /life-os/api/v1/actuator/health/readiness`: Kubernetes readiness probe (includes DB connection check).
- `GET /life-os/api/v1/actuator/prometheus`: Prometheus-formatted metrics scrape endpoint.
- `GET /life-os/api/v1/actuator/metrics`: Micrometer metric exploration endpoint.

---

## 4. Alert Thresholds and Runbook Rules

| Alert Name | Severity | Condition | Eval Window | Operational Runbook Action |
| --- | --- | --- | --- | --- |
| `HighApi5xxErrorRate` | Critical | HTTP 5xx rate > 1.0% of total API traffic | 5 minutes | Inspect application JSON logs for trace correlation ID; check PostgreSQL health. |
| `HighApiLatency` | Warning | API p95 latency > 1,500 ms | 5 minutes | Check slow query logs, DB connection pool saturation, and CPU utilization. |
| `AuthFailureSpike` | Warning | Auth failures (`result="FAILURE"`) > 50 / min | 2 minutes | Verify rate-limiter operation (`RateLimiterService`) and Cloudflare WAF rules. |
| `DbPoolSaturation` | Critical | `hikaricp.connections.pending` > 5 or active > 85% | 3 minutes | Check long-running transactions, query timeout configurations, and DB instance CPU. |
| `BackgroundJobFailureSpike` | Warning | Job failures (`status="DEAD_LETTER"`) > 5% | 15 minutes | Inspect `BackgroundJobWorker` logs for exception root cause; verify external dependencies. |
| `BackupAgeExceeded` | Critical | Backup age > 26 hours | 1 hour | Verify backup cron execution (`backup-postgres.sh`) and GPG encryption status. |
| `TLSExpiryWarning` | Warning | Origin TLS certificate expiry < 14 days | 24 hours | Renew Cloudflare Origin CA certificate and update host Caddy tls bundle. |

---

## 5. Verification Contract

Automated unit and integration tests (`MetricsContractTests`) continuously validate that:
1. All metric categories are registered with Micrometer `MeterRegistry`.
2. Metric values increment or record expected durations upon domain actions.
3. Label privacy assertions guarantee zero user PII or high-cardinality tags.
