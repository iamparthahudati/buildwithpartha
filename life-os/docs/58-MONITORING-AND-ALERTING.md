# 58 — Monitoring and Alerting

- Status: Accepted
- Date: 2026-09-12
- Ticket: [LOS-1610](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-1412](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/44-METRICS-AND-ALERTS-CONTRACT.md), [LOS-1604](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/38-PRODUCTION-COMPOSE-AND-CADDY.md)

---

## 1. Executive Summary

This document specifies the end-to-end monitoring and alerting architecture for LifeOS production and staging environments. Coverage spans:

- **External uptime** — Blackbox Exporter probing `https://buildwithpartha.tech/life-os` and the API readiness endpoint from outside the VPS origin.
- **Origin/API readiness** — Internal Spring Boot Actuator readiness and liveness health probes.
- **TLS certificate expiry** — Blackbox HTTPS probe reporting certificate expiry days; alert fires at < 14 days.
- **5xx error rate and API latency** — Prometheus scrape of `lifeos.api.requests` and `lifeos.api.request.duration` from the Micrometer `/actuator/prometheus` endpoint.
- **Database, disk, CPU, and memory** — Node Exporter (system resources) and PostgreSQL Exporter (DB connection pool and query health).
- **Job, mail, and backup age** — Prometheus rules evaluate the age of the last successful backup status JSON and scrape `lifeos.job.executions` / `lifeos.mail.sends` from the application metrics endpoint.
- **Actionable alert routing and runbooks** — Alertmanager routes every alert to a named receiver with linked runbook steps.

---

## 2. Stack Overview

| Component | Image | Role |
| --- | --- | --- |
| `prometheus` | `prom/prometheus:v2.53.1` | Metrics scrape engine, alerting rule evaluation, 15-day retention. |
| `alertmanager` | `prom/alertmanager:v0.27.0` | Alert deduplication, grouping, inhibition, and routing to receivers. |
| `blackbox-exporter` | `prom/blackbox-exporter:v0.25.0` | HTTP/HTTPS probes for uptime, TLS expiry, and endpoint reachability. |
| `node-exporter` | `prom/node-exporter:v1.8.2` | VPS host system metrics (CPU, memory, disk, network). |
| `postgres-exporter` | `prometheuscommunity/postgres-exporter:v0.16.0` | PostgreSQL connection pool and query statistics. |

All monitoring services run in a private `monitoring-net` Docker network. No monitoring ports are exposed externally. Prometheus scrape targets include the application containers via internal Docker DNS.

---

## 3. Network and Security Boundaries

```
                 +-----------------------------------+
                 |          monitoring-net           |
                 |  prometheus  alertmanager         |
                 |  blackbox-exporter  node-exporter |
                 |  postgres-exporter                |
                 +----------+------------------------+
                            |  (internal scrape only)
          +-----------------+------------------+
          |   backend-net (existing)            |
          |   lifeos-api (Spring Boot)          |
          |   /actuator/prometheus              |
          +-----------------+------------------+
                            |
                 +----------+----------+
                 |  db-net (existing)  |
                 |  lifeos-postgres    |
                 +---------------------+
```

Rules:
- `prometheus` is accessible only on `monitoring-net`; no host port binding in production.
- `alertmanager` is accessible only on `monitoring-net`; webhook/email notifications exit via the VPS network.
- `node-exporter` binds to `127.0.0.1:9100` on the host network namespace; not exposed on any public interface.
- `postgres-exporter` sits on `monitoring-net` and `db-net` only; the exporter user has `SELECT` on `pg_stat_*` views only.
- No user data, credentials, or PII appear in any metric label (enforced by `MetricsService.sanitizeTag` — see `docs/44-METRICS-AND-ALERTS-CONTRACT.md`).

---

## 4. Prometheus Configuration

### 4.1 Global settings

```yaml
# life-os/infra/monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    env: production
    app: lifeos
```

### 4.2 Scrape targets

| Job Name | Target | Purpose |
| --- | --- | --- |
| `lifeos-api` | `lifeos-api:8080` | Spring Boot Actuator `/actuator/prometheus` (all Micrometer metrics from LOS-1412). |
| `blackbox-http` | `blackbox-exporter:9115` | HTTP/HTTPS probes via `probe_http` module. |
| `blackbox-tls` | `blackbox-exporter:9115` | HTTPS TLS certificate expiry via `probe_http` module with `tls_config`. |
| `node` | `node-exporter:9100` | Host CPU, memory, disk, and network. |
| `postgres` | `postgres-exporter:9187` | PostgreSQL connection and query statistics. |

### 4.3 Alerting rule files

All alert rules are loaded from `life-os/infra/monitoring/prometheus/rules/`:

- `rules/uptime.yml` — External uptime and TLS probes.
- `rules/api.yml` — 5xx rate, API latency (p95), and auth failure spikes.
- `rules/database.yml` — Connection pool saturation, PostgreSQL replica lag (N/A for single-node — rule exists for future use), and replication slot accumulation.
- `rules/system.yml` — CPU, memory, disk pressure on the VPS host.
- `rules/jobs.yml` — Background job dead-letters, mail send failures, and backup age.

---

## 5. Blackbox Exporter Probes

### 5.1 External uptime probe

**Target URLs probed every 60 seconds:**

| Probe Target | Expectation |
| --- | --- |
| `https://buildwithpartha.tech/life-os` | HTTP 200, body contains `<html`, TLS valid. |
| `https://buildwithpartha.tech/life-os/api/v1/actuator/health` | HTTP 200, body contains `"status":"UP"`. |

> [!IMPORTANT]
> The external probe hits the public Cloudflare-fronted URL. This validates the full path: Cloudflare → Caddy → web/api container, not just the origin container directly.

### 5.2 TLS expiry probe

The `probe_http` module records `probe_ssl_earliest_cert_expiry` (Unix timestamp of the soonest-expiring certificate in the chain). The `TLSExpiryWarning` rule fires when fewer than 14 days remain.

### 5.3 Internal readiness probe

The internal Spring Boot Actuator endpoints probed via `lifeos-api:8080`:

| Endpoint | Purpose |
| --- | --- |
| `/life-os/api/v1/actuator/health/liveness` | Liveness — process is running. |
| `/life-os/api/v1/actuator/health/readiness` | Readiness — DB connection available, application ready. |

---

## 6. Alert Rules

All alert rules follow the format: `alert: CamelCaseName`, `severity` label (`critical`, `warning`, `info`), `runbook_url` annotation linking to this document's runbook section.

### 6.1 Uptime alerts

| Alert Name | Severity | Condition | For | Runbook |
| --- | --- | --- | --- | --- |
| `UptimeProbeDown` | critical | `probe_success{job="blackbox-http"} == 0` | 2m | §8.1 |
| `ApiReadinessDown` | critical | `probe_success{instance=~".*/actuator/health/readiness"} == 0` | 2m | §8.2 |
| `TLSExpiryWarning` | warning | `(probe_ssl_earliest_cert_expiry - time()) / 86400 < 14` | 1h | §8.3 |
| `TLSExpiryCritical` | critical | `(probe_ssl_earliest_cert_expiry - time()) / 86400 < 3` | 15m | §8.3 |

### 6.2 API alerts

| Alert Name | Severity | Condition | For | Runbook |
| --- | --- | --- | --- | --- |
| `HighApi5xxErrorRate` | critical | `rate(lifeos_api_requests_total{status_class="5xx"}[5m]) / rate(lifeos_api_requests_total[5m]) > 0.01` | 5m | §8.4 |
| `HighApiLatency` | warning | `histogram_quantile(0.95, rate(lifeos_api_request_duration_seconds_bucket[5m])) > 1.5` | 5m | §8.5 |
| `AuthFailureSpike` | warning | `rate(lifeos_auth_login_attempts_total{result="FAILURE"}[2m]) * 60 > 50` | 2m | §8.6 |

### 6.3 Database alerts

| Alert Name | Severity | Condition | For | Runbook |
| --- | --- | --- | --- | --- |
| `DbPoolSaturation` | critical | `hikaricp_connections_pending{pool="LifeOsPool"} > 5 or hikaricp_connections_active{pool="LifeOsPool"} / hikaricp_connections_max{pool="LifeOsPool"} > 0.85` | 3m | §8.7 |
| `DbConnectionsDown` | critical | `pg_up == 0` | 1m | §8.8 |
| `DbDiskHighUsage` | warning | `pg_database_size_bytes{datname="lifeos_prod"} > 3e9` | 15m | §8.9 |

### 6.4 System alerts

| Alert Name | Severity | Condition | For | Runbook |
| --- | --- | --- | --- | --- |
| `HostHighCpu` | warning | `100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85` | 10m | §8.10 |
| `HostHighMemory` | warning | `(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 90` | 5m | §8.11 |
| `HostDiskPressure` | warning | `(node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100 > 85` | 5m | §8.12 |
| `HostDiskCritical` | critical | `(node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100 > 95` | 5m | §8.12 |

### 6.5 Job/mail/backup age alerts

| Alert Name | Severity | Condition | For | Runbook |
| --- | --- | --- | --- | --- |
| `BackupAgeExceeded` | critical | `(time() - lifeos_backup_last_success_timestamp_seconds) / 3600 > 26` | 1h | §8.13 |
| `BackgroundJobDeadLetter` | warning | `rate(lifeos_job_executions_total{status="DEAD_LETTER"}[15m]) / rate(lifeos_job_executions_total[15m]) > 0.05` | 15m | §8.14 |
| `MailSendFailureSpike` | warning | `rate(lifeos_mail_sends_total{status="FAILURE"}[10m]) / rate(lifeos_mail_sends_total[10m]) > 0.10` | 10m | §8.15 |

---

## 7. Alertmanager Routing

### 7.1 Routing tree

```
route:
  group_by: [alertname, severity, env]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: default-null
  routes:
    - match: { severity: critical }
      receiver: owner-critical
      continue: false
    - match: { severity: warning }
      receiver: owner-warning
      continue: false
```

### 7.2 Receivers

| Receiver | Delivery | Description |
| --- | --- | --- |
| `owner-critical` | Email (configurable webhook/PagerDuty future) | All `critical` alerts. Response SLA: 15 min. |
| `owner-warning` | Email | All `warning` alerts. Response SLA: 4 hours. |
| `default-null` | None | Catch-all for `info` or unrouted alerts. |

### 7.3 Inhibition rules

| Source Alert | Target Alert | Effect |
| --- | --- | --- |
| `UptimeProbeDown` (critical) | `HighApi5xxErrorRate`, `HighApiLatency`, `ApiReadinessDown` | Suppress API alerts when the external probe is down (likely a network or Cloudflare issue rather than an application fault). |
| `DbConnectionsDown` (critical) | `DbPoolSaturation`, `DbHighQueryLatency` | Suppress pool alerts when DB is completely down. |

---

## 8. Operational Runbooks

### §8.1 UptimeProbeDown — External uptime probe failure

**Symptom**: `https://buildwithpartha.tech/life-os` returns non-200 or times out for ≥ 2 minutes.

**Steps**:
1. Verify from a different network: `curl -I https://buildwithpartha.tech/life-os`.
2. Check Cloudflare status at `https://www.cloudflarestatus.com/`.
3. SSH to VPS and check containers: `docker compose -f life-os/infra/compose/compose.prod.yml ps`.
4. Check Caddy logs: `docker logs lifeos-caddy --tail=100`.
5. Check web container logs: `docker logs lifeos-web --tail=100`.
6. If Caddy is healthy but Cloudflare is the issue, consider enabling Cloudflare Development Mode temporarily.
7. If containers are unhealthy, restart: `docker compose -f life-os/infra/compose/compose.prod.yml restart web caddy`.

### §8.2 ApiReadinessDown — API readiness probe failure

**Symptom**: `/actuator/health/readiness` returns non-200 for ≥ 2 minutes.

**Steps**:
1. Check API container: `docker logs lifeos-api --tail=200 | grep -i "ERROR\|WARN\|health"`.
2. Check PostgreSQL container: `docker exec lifeos-postgres pg_isready`.
3. Check DB connection pool in Prometheus: `hikaricp_connections_pending{pool="LifeOsPool"}`.
4. Inspect Flyway migration status: look for `FlywayMigrationScriptException` in API logs.
5. If DB is the issue, see §8.8. If application is the issue, restart API: `docker compose restart api`.

### §8.3 TLSExpiryWarning / TLSExpiryCritical — Certificate near expiry

**Symptom**: TLS certificate expiry < 14 days (Warning) or < 3 days (Critical).

**Steps**:
1. Verify: `echo | openssl s_client -connect buildwithpartha.tech:443 2>/dev/null | openssl x509 -noout -dates`.
2. Log into Cloudflare Dashboard → SSL/TLS → Origin Server → check Origin Certificate expiry.
3. Regenerate Cloudflare Origin CA certificate (15-year validity): Cloudflare → SSL/TLS → Origin Server → Create Certificate.
4. Copy new certificate PEM to VPS: `/etc/life-os/tls/origin.crt` and `/etc/life-os/tls/origin.key`.
5. Reload Caddy: `docker exec lifeos-caddy caddy reload --config /etc/caddy/Caddyfile`.
6. Verify new expiry with step 1.

### §8.4 HighApi5xxErrorRate — Sustained 5xx errors

**Symptom**: > 1% of API requests return HTTP 5xx for 5 minutes.

**Steps**:
1. Check API logs: `docker logs lifeos-api --tail=500 | grep -E "ERROR|5[0-9]{2}"`.
2. Identify the failing endpoint from Prometheus: `lifeos_api_requests_total{status_class="5xx"}` by `uri_template`.
3. Check DB health (§8.7, §8.8).
4. Check disk pressure (§8.12) — a full disk causes write failures.
5. Check for OOM kills: `dmesg | grep -i oom`.
6. If the issue is transient: monitor. If sustained: consider rolling restart `docker compose restart api`.

### §8.5 HighApiLatency — API p95 latency > 1.5s

**Symptom**: API 95th-percentile latency exceeds 1,500 ms for 5 minutes.

**Steps**:
1. Check slow query log in Prometheus: `lifeos_db_query_duration_seconds` histogram by `query_type`.
2. Check DB connection pool: `hikaricp_connections_pending{pool="LifeOsPool"}`.
3. Check VPS CPU (§8.10) and memory (§8.11).
4. Run `EXPLAIN ANALYZE` on slow queries identified from logs.
5. Check if a batch job (`DATA_EXPORT`, `ACCOUNT_DELETION`) is running concurrently: `docker logs lifeos-api | grep "BackgroundJobWorker"`.

### §8.6 AuthFailureSpike — Authentication failure rate spike

**Symptom**: Login failures > 50/min for 2 minutes.

**Steps**:
1. Verify `RateLimiterService` is active: `docker logs lifeos-api | grep "RateLimitingInterceptor"`.
2. Check Cloudflare WAF rate-limiting rule for `POST /life-os/api/v1/auth/login` (10 req/min per IP).
3. Check for IP block via UFW: `sudo ufw status`.
4. If a specific IP is flooding: `sudo ufw deny from <ip>`.
5. Consider enabling Cloudflare "Under Attack Mode" temporarily.

### §8.7 DbPoolSaturation — Database connection pool saturated

**Symptom**: > 5 threads pending a DB connection OR > 85% of pool connections active for 3 minutes.

**Steps**:
1. Check pool metrics: `hikaricp_connections_active`, `hikaricp_connections_pending` in Prometheus.
2. Identify long-running transactions: `SELECT pid, query, state, query_start FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start ASC`.
3. Terminate blockers if necessary: `SELECT pg_terminate_backend(<pid>)`.
4. Check if a batch job is holding connections: `docker logs lifeos-api | grep "BackgroundJobWorker"`.
5. Verify HikariCP `maximum-pool-size: 10` in `application.yml`; if CPU/RAM allows, temporarily increase.

### §8.8 DbConnectionsDown — PostgreSQL unreachable

**Symptom**: `pg_up == 0` for ≥ 1 minute.

**Steps**:
1. Check PostgreSQL container: `docker compose -f life-os/infra/compose/compose.prod.yml ps postgres`.
2. Check logs: `docker logs lifeos-postgres --tail=100`.
3. Check disk space (§8.12) — PostgreSQL stops on disk full.
4. Attempt restart: `docker compose -f life-os/infra/compose/compose.prod.yml restart postgres`.
5. If data directory is corrupted, initiate restoration from backup: see `docs/42-POSTGRESQL-BACKUP-AND-RESTORE.md`.

### §8.9 DbDiskHighUsage — PostgreSQL database size > 3 GB

**Symptom**: Database size exceeds 3 GB.

**Steps**:
1. Check table sizes: `SELECT relname, pg_size_pretty(pg_total_relation_size(oid)) FROM pg_class WHERE relkind='r' ORDER BY pg_total_relation_size(oid) DESC LIMIT 20`.
2. Check for dead tuple accumulation: `SELECT relname, n_dead_tup FROM pg_stat_user_tables ORDER BY n_dead_tup DESC`.
3. Run `VACUUM ANALYZE` if dead tuples are high.
4. Check if the `product_activity_events` or `security_audit_events` tables are growing beyond expected retention — purge old records per privacy policy.

### §8.10 HostHighCpu — VPS CPU utilization > 85%

**Symptom**: Average CPU utilization exceeds 85% for 10 minutes.

**Steps**:
1. SSH to VPS: `top -b -n1 | head -30`.
2. Check which container is consuming CPU: `docker stats --no-stream`.
3. If `lifeos-api` is high: check for tight retry loops or batch job surge.
4. If `lifeos-postgres` is high: check slow queries (§8.5).
5. If `lifeos-caddy` is high: check for DDoS patterns in access log.

### §8.11 HostHighMemory — VPS memory utilization > 90%

**Symptom**: Available memory below 10% of total for 5 minutes.

**Steps**:
1. Check container memory: `docker stats --no-stream`.
2. Check if JVM heap is exceeding configured limits: `docker logs lifeos-api | grep -i "OutOfMemoryError"`.
3. Check for memory leak patterns in API logs.
4. Restart API if OOM is imminent: `docker compose restart api`.
5. Consider increasing JVM heap allocation if consistently hitting limits within resource budget.

### §8.12 HostDiskPressure / HostDiskCritical — Disk usage high

**Symptom**: Disk usage > 85% (warning) or > 95% (critical).

**Steps**:
1. Check disk usage: `df -h` and `du -sh /var/lib/docker /var/log /var/backups`.
2. Prune unused Docker images: `docker image prune -f`.
3. Prune unused volumes (caution — check which are active first): `docker volume ls` then `docker volume prune -f`.
4. Check log size: `du -sh /var/log/life-os/`.
5. Rotate/truncate logs if log rotation is not running: `logrotate -f /etc/logrotate.conf`.
6. Check backup directory for orphaned files: `/var/backups/life-os/`.
7. If Critical: immediately free space and alert owner.

### §8.13 BackupAgeExceeded — Last successful backup > 26 hours ago

**Symptom**: Time since last successful backup exceeds 26 hours.

**Steps**:
1. Check backup status file: `cat /var/log/life-os/postgres-backup-status.json | jq .`.
2. Check backup cron: `crontab -l | grep backup`.
3. Check backup script logs: `journalctl -u cron | grep backup`.
4. Re-run manually: `bash life-os/scripts/backup-postgres.sh --target=production`.
5. Verify off-VPS replication hook executed if enabled.

### §8.14 BackgroundJobDeadLetter — Dead-letter job rate > 5%

**Symptom**: Background job dead-letter rate exceeds 5% over 15 minutes.

**Steps**:
1. Check API logs: `docker logs lifeos-api | grep "DEAD_LETTER"`.
2. Identify job kind from Prometheus: `lifeos_job_executions_total{status="DEAD_LETTER"}` by `kind`.
3. If `DATA_EXPORT`: check disk space and attachment storage paths.
4. If `ACCOUNT_DELETION`: check DB consistency and deletion ledger.
5. If `ATTACHMENT_SCAN`: check file storage mount is available.

### §8.15 MailSendFailureSpike — Mail send failure rate > 10%

**Symptom**: Transactional mail failure rate exceeds 10% over 10 minutes.

**Steps**:
1. Check API logs: `docker logs lifeos-api | grep "mail"`.
2. Check SMTP credentials in `/etc/life-os/secrets/.env.production` are valid.
3. Check mail provider status page.
4. Verify SPF/DKIM/DMARC records for `buildwithpartha.tech`.

---

## 9. Backup Age Metric

The `lifeos_backup_last_success_timestamp_seconds` metric is a Prometheus custom gauge exposed from the `/actuator/prometheus` endpoint. The Spring Boot application reads the backup status JSON files and exposes the last-success timestamp:

- **PostgreSQL backup**: reads `/var/log/life-os/postgres-backup-status.json` field `last_success_epoch`.
- **App files backup**: reads `/var/log/life-os/app-files-backup-status.json` field `last_success_epoch`.

These are exposed via `BackupStatusMetricsProvider` registered as a Micrometer `MeterBinder`. This keeps backup health visible in the same Prometheus scrape endpoint as all other application metrics.

---

## 10. Verification Contract

The automated verification script (`life-os/scripts/validate-monitoring-and-alerting.sh`) asserts:

1. All required Prometheus configuration files exist and are syntactically valid YAML.
2. All alert rule files exist and contain the mandatory `alert`, `expr`, `for`, `labels.severity`, and `annotations.runbook_url` fields.
3. All Alertmanager configuration files exist and routing tree covers `critical` and `warning` severities.
4. The monitoring compose overlay file exists and references pinned image versions.
5. All referenced scripts and services are executable and resolvable.
6. The `BackupStatusMetricsProvider` class exists in the API source tree.
7. Dry-run execution of the validation script exits cleanly with code 0.

---

## 11. Known Limitations

- **No Grafana dashboards** in scope for LOS-1610. Grafana dashboards are a follow-up improvement (post-launch). Prometheus expression browser provides ad-hoc visibility.
- **No PagerDuty/OpsGenie integration** in scope for LOS-1610. Alertmanager email receiver is the delivery channel; webhook integration is a post-launch enhancement.
- **External probe hits Cloudflare IP**, not origin directly. If Cloudflare is healthy but the origin is not, the Blackbox probe may not fire. The internal readiness probe via `ApiReadinessDown` covers this gap.
- **Prometheus data retention is 15 days** on the VPS. Long-term trending requires a remote write target (out of scope for v1).
- **postgres-exporter uses `DATA_SOURCE_NAME`** environment variable referencing the application's database; ensure the exporter user has only read access to `pg_stat_*` views.
