# 59 — Centralized Safe Logs

- Status: Accepted
- Date: 2026-09-12
- Ticket: [LOS-1611](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-1411](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-14-BACKEND-OPERATIONS.md), [LOS-1604](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/38-PRODUCTION-COMPOSE-AND-CADDY.md)

---

## 1. Executive Summary

This document specifies the centralized safe log management architecture for LifeOS production and staging environments. Coverage spans:

- **Log sources** — Docker container stdout/stderr for all production services (Caddy, API, web, Postgres) and the monitoring stack (Prometheus, Alertmanager, Blackbox Exporter, Node Exporter, postgres-exporter).
- **Rotation and retention** — Docker `json-file` logging driver enforces per-service disk caps; host-level `logrotate` handles archival rotation, compression, and 14-day retention for any file-backed logs.
- **Protected access** — Log archive files are `root:deploy` owned with `640` permissions (protected). Container log files managed by Docker are accessible only via `docker logs` by the `deploy` user (sudoless read access scoped to Docker socket).
- **Correlation search** — Operational script (`scripts/search-logs-by-correlation.sh`) searches all container logs by `correlationId`, `traceId`, or free-text across one or all services using `docker logs` + `jq`.
- **Redaction verification** — Confirmed via LOS-1411: `StructuredJsonLayout` strips passwords, tokens, cookies, and authorization header values before writing. Verified by the `StructuredLoggingTests` redaction test suite.
- **Disk-pressure protection** — Layered defence: Docker `max-size`/`max-file` caps at the container level, `logrotate maxsize` at the host level, and Prometheus `HostDiskPressure`/`HostDiskCritical` alerts (LOS-1610) at the observability level.

**Non-negotiable rule**: Logs cannot expose user content (email body, task titles, note text, attachment names) or secrets (passwords, tokens, session cookies, SMTP credentials).

---

## 2. Log Architecture Overview

### 2.1 Log sources

| Service | Container Name | Log Source | Format |
| --- | --- | --- | --- |
| Caddy reverse proxy | `lifeos-caddy` | stdout (Caddy structured JSON access log + error log) | JSON |
| API (Spring Boot) | `lifeos-api` | stdout (`StructuredJsonLayout` — LOS-1411) | JSON (single-line per event) |
| Web (nginx) | `lifeos-web` | stdout (nginx combined format) | Text |
| PostgreSQL | `lifeos-postgres` | stdout (PostgreSQL log) | Text |
| Prometheus | `lifeos-prometheus` | stdout | Text |
| Alertmanager | `lifeos-alertmanager` | stdout | Text |
| Blackbox Exporter | `lifeos-blackbox-exporter` | stdout | Text |
| Node Exporter | `lifeos-node-exporter` | stdout | Text |
| postgres-exporter | `lifeos-postgres-exporter` | stdout | Text |

All services write to stdout/stderr only. Docker captures these streams via the `json-file` logging driver and stores them in `/var/lib/docker/containers/<id>/<id>-json.log` on the host.

### 2.2 Architecture diagram

```
Application Containers (stdout)
        |
        v
Docker json-file driver
/var/lib/docker/containers/*/
  └── *-json.log (max-size: 100m, max-file: 14, compress: true)
        |
        +---> docker logs <container> [--since <time>]
        |          |
        |          v
        |    search-logs-by-correlation.sh
        |    (jq-based correlation/trace search)
        |
        v
Host-level /var/log/life-os/
  ├── app-backup-status.log   (written by backup scripts — LOS-1608/1609)
  ├── postgres-backup-status.json
  └── app-files-backup-status.json
        |
        v
logrotate /etc/logrotate.d/lifeos
  (daily, 14 rotations, compress, maxsize 500M)
```

No external log aggregation service (e.g., Loki, Elasticsearch) is deployed in v1. The Docker `json-file` driver with sized rotation provides sufficient log access for operational use on a single VPS. A future ticket may add Loki + Grafana for long-term log retention and dashboards.

---

## 3. Docker Logging Driver Configuration

All production and monitoring services use the `json-file` logging driver with the following options applied uniformly:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "100m"
    max-file: "14"
    compress: "true"
    labels: "service"
```

### 3.1 Capacity accounting

| Parameter | Value | Effect |
| --- | --- | --- |
| `max-size` | 100 MB | Each log file segment is capped at 100 MB. |
| `max-file` | 14 | At most 14 segments per service (1 active + 13 compressed). |
| `compress` | true | Rotated files are gzip-compressed; effective on-disk size is ~5–15 MB per rotated file. |
| **Max per service** | ~1.4 GB uncompressed / ~200–400 MB compressed | Docker auto-rotates and purges oldest file once `max-file` is reached. |
| **9 services total** | ~12.6 GB theoretical cap | Compressed: ~1.8–3.6 GB. Prometheus `HostDiskCritical` fires at 95% disk — pressure is caught long before hard cap. |

### 3.2 Access control

Docker container log files are stored in `/var/lib/docker/containers/` with `root:root 600` permissions. The `deploy` OS user has Docker socket access (`docker` group membership) which allows `docker logs <container>` reads without `sudo`. No other OS users can read raw log files.

---

## 4. Host-Level Logrotate Configuration

The logrotate config at `infra/logrotate/lifeos-logs.conf` is deployed to `/etc/logrotate.d/lifeos` on the VPS.

It covers `/var/log/life-os/*.log` — the file-backed logs written by backup scripts and any host-level processes.

### 4.1 Configuration

```
/var/log/life-os/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    maxsize 500M
    create 0640 root deploy
    postrotate
        # Signal cron daemon if it wrote to a log file
        [ -f /var/run/crond.pid ] && kill -HUP $(cat /var/run/crond.pid) 2>/dev/null || true
    endscript
}
```

| Directive | Value | Reason |
| --- | --- | --- |
| `daily` | — | Rotate once per day. |
| `rotate 14` | 14 copies | 14-day history; older files are deleted. |
| `compress` | — | gzip compression on rotated files. |
| `delaycompress` | — | Compress on the second rotation to allow any writer still holding the file to finish. |
| `missingok` | — | No error if log file is absent (e.g., backup has not run yet). |
| `notifempty` | — | Skip rotation if file is empty. |
| `maxsize 500M` | 500 MB | Forces rotation if a file reaches 500 MB before the daily schedule — disk-pressure guard. |
| `create 0640 root deploy` | — | New log files are owner-only + deploy-group readable; world has no access. |

---

## 5. Protected Access Policy

| Log Location | Owner | Permissions | Access Method |
| --- | --- | --- | --- |
| `/var/lib/docker/containers/*/` | `root:root` | `600` | `docker logs <container>` (requires Docker socket, i.e., `deploy` group) |
| `/var/log/life-os/*.log` | `root:deploy` | `640` | Direct file read by `root` or `deploy` user |
| `/var/log/life-os/*.log.gz` (archived) | `root:deploy` | `640` | `zcat` or `zgrep` by `root` or `deploy` user |
| `/etc/life-os/secrets/` | `root:deploy` | `750` dir, `640` files | Referenced by containers only; no logging of secrets |

**Audit rule**: Neither `docker logs` output nor rotated log archives may be world-readable. Any `chmod o+r` on log files or directories is a security violation.

---

## 6. Redaction Verification

All API log output passes through `StructuredJsonLayout` (implemented in LOS-1411). The layout enforces the following redaction rules before serializing the log event to JSON:

| Field or pattern | Redaction behavior |
| --- | --- |
| `password`, `passwd`, `secret`, `token`, `api_key`, `apikey` in MDC or log message | Replaced with `[REDACTED]` |
| `Authorization: Bearer <value>` | Header value replaced with `[REDACTED]` |
| `Set-Cookie` / `Cookie` header values | Replaced with `[REDACTED]` |
| `X-CSRF-Token` header value | Replaced with `[REDACTED]` |
| SMTP credentials in environment | Never logged; only log metadata (e.g., `to` address redacted to domain-only if privacy level is strict) |

**Verification**: `StructuredLoggingTests.java` (LOS-1411) includes explicit redaction assertions that fail the build if a sensitive pattern appears in log output. This test suite runs in CI on every PR.

**Additional guarantees**:
- Application log events contain only: `timestamp`, `level`, `thread`, `logger`, `message`, `correlationId`, `traceId`, `spanId`, `jobKind`, and structured exception details. No request or response bodies are logged.
- Caddy access logs are configured with the `log` directive in structured JSON format, omitting response bodies. The logged fields are: `ts`, `level`, `msg`, `request.method`, `request.uri` (path only, no query strings containing auth params), `status`, `duration`, `size`, `request.remote_ip`. Auth query parameters (e.g., `token=`) are stripped by Caddy's `query` log filter.
- PostgreSQL logs are configured at `log_min_duration_statement = 1000` (log only slow queries ≥ 1 second). Statement logging does not include bound parameter values (`log_line_prefix` does not include `%p` with data).

---

## 7. Correlation Search

### 7.1 Operational script

The `scripts/search-logs-by-correlation.sh` script enables an operator to retrieve all log lines related to a single request, job execution, or trace:

```
Usage:
  search-logs-by-correlation.sh --id <correlationId|traceId|text>
                                 [--field correlationId|traceId|message]
                                 [--service api|caddy|web|postgres|all]
                                 [--since <duration>]   # e.g. 1h, 30m, 2h
                                 [--until <timestamp>]  # ISO-8601 or relative
                                 [--raw]                # print raw JSON lines

Examples:
  # Find all log lines for a specific HTTP request correlation ID
  search-logs-by-correlation.sh --id "abc123" --service api

  # Search all services for a trace ID in the last 2 hours
  search-logs-by-correlation.sh --id "4bf92f3577b34da6" --field traceId --since 2h

  # Search for a job execution by job correlation prefix
  search-logs-by-correlation.sh --id "job-" --service api --since 30m
```

**Implementation**: `docker logs --since <duration> <container> 2>&1 | jq -c --arg id "$SEARCH_ID" --arg field "$SEARCH_FIELD" 'select(.[$field] // "" | contains($id))'`

### 7.2 Output format

Each matched log line is printed as a formatted summary:
```
[2026-09-12T04:31:22Z] [INFO] [correlationId=abc123] [traceId=4bf92f] tech.buildwithpartha.lifeos.auth.AuthService — Login succeeded
```

With `--raw`, the full JSON object is printed unmodified for piping to `jq` or further processing.

---

## 8. Disk-Pressure Protection Summary

Disk pressure is defended at three layers:

| Layer | Mechanism | Threshold | Action |
| --- | --- | --- | --- |
| Container (Docker driver) | `max-size: 100m`, `max-file: 14` | 100 MB per segment | Docker auto-rotates and purges oldest |
| Host file logs (logrotate) | `maxsize 500M` | 500 MB per file | logrotate forces rotation before daily schedule |
| Observability (Prometheus) | `HostDiskPressure` (warning) | 85% disk used | Alert → operator checks `du -sh /var/lib/docker /var/log` and prunes |
| Observability (Prometheus) | `HostDiskCritical` (critical) | 95% disk used | Alert → immediate operator action (§8.12 runbook in `58-MONITORING-AND-ALERTING.md`) |

Docker image and volume pruning (`docker image prune -f`) is the first-line response when disk pressure is triggered. Log directory is the second check: `du -sh /var/lib/docker/containers/ /var/log/life-os/`.

---

## 9. Staging Parity

The staging environment (`compose.staging.yml`) applies the same Docker `json-file` logging driver configuration as production. Logrotate is installed on the staging VPS with the same `lifeos-logs.conf`. Staging log archives are retained for 7 days (half of production) because staging is ephemeral.

A `STAGING_LOG_RETAIN_DAYS=7` override in the staging logrotate config is applied by setting `rotate 7` in the staging-specific file (`infra/logrotate/lifeos-logs.staging.conf`).

---

## 10. Verification Contract

The automated verification script (`life-os/scripts/validate-centralized-logs.sh`) asserts:

1. Specification document `docs/59-CENTRALIZED-SAFE-LOGS.md` exists.
2. Logrotate config `infra/logrotate/lifeos-logs.conf` exists and contains: `rotate 14`, `compress`, `delaycompress`, `maxsize`, `create 0640`.
3. `infra/compose/compose.prod.yml` contains `driver: "json-file"`, `max-size`, `max-file`, and `compress` options for all 4 production services.
4. `infra/compose/compose.monitoring.yml` contains `driver: "json-file"`, `max-size`, `max-file`, and `compress` options for all 5 monitoring services.
5. `scripts/search-logs-by-correlation.sh` exists and is executable.
6. `StructuredJsonLayout.java` exists in the API source tree (redaction implementation present).
7. Script dry-run exits cleanly with code 0.

---

## 11. Known Limitations

- **No centralized log aggregation service** (e.g., Loki, Elasticsearch) in scope for LOS-1611. `docker logs` + `grep`/`jq` correlation search is sufficient for a single VPS; a Loki + Grafana integration is a post-launch enhancement.
- **Postgres log parameters** (slow query threshold, `log_line_prefix`) require PostgreSQL configuration changes not automated by this ticket. The Postgres container uses default settings unless overridden via `POSTGRES_LOG_MIN_DURATION_STATEMENT` environment variable — this is a configuration note, not a code change.
- **Docker log file location** (`/var/lib/docker/containers/`) is not customized in v1. Docker's `data-root` could be moved to a dedicated disk partition for stricter isolation — post-launch improvement.
- **Caddy query-string log filtering** is described in this specification and the Caddyfile. The Caddyfile itself is out of scope for this ticket's code changes; the filter should be applied when the Caddyfile is next modified.
