# LifeOS Log Rotation — Deployment Guide

Specification: [`docs/59-CENTRALIZED-SAFE-LOGS.md`](../../docs/59-CENTRALIZED-SAFE-LOGS.md)

## Overview

LifeOS uses a two-layer log rotation strategy:

1. **Docker `json-file` driver** (per-service) — manages container stdout/stderr logs automatically. Configured in `infra/compose/compose.prod.yml` and `infra/compose/compose.monitoring.yml`.
2. **Host-level `logrotate`** — manages `/var/log/life-os/*.log` files written by backup scripts and host processes.

## Files

| File | Purpose | Deploy target |
| --- | --- | --- |
| `lifeos-logs.conf` | Production logrotate config (14-day retention) | `/etc/logrotate.d/lifeos` on production VPS |
| `lifeos-logs.staging.conf` | Staging logrotate config (7-day retention) | `/etc/logrotate.d/lifeos` on staging VPS |

## Deployment — Production

```bash
# 1. Copy the logrotate config
sudo cp life-os/infra/logrotate/lifeos-logs.conf /etc/logrotate.d/lifeos
sudo chmod 644 /etc/logrotate.d/lifeos
sudo chown root:root /etc/logrotate.d/lifeos

# 2. Ensure log directory exists with correct permissions
sudo mkdir -p /var/log/life-os
sudo chown root:deploy /var/log/life-os
sudo chmod 750 /var/log/life-os

# 3. Verify the configuration (dry-run — no files are rotated)
sudo logrotate -d /etc/logrotate.d/lifeos

# 4. Run once manually to confirm no errors
sudo logrotate -v /etc/logrotate.d/lifeos
```

## Deployment — Staging

```bash
sudo cp life-os/infra/logrotate/lifeos-logs.staging.conf /etc/logrotate.d/lifeos
sudo chmod 644 /etc/logrotate.d/lifeos
sudo chown root:root /etc/logrotate.d/lifeos
sudo mkdir -p /var/log/life-os
sudo chown root:deploy /var/log/life-os
sudo chmod 750 /var/log/life-os
sudo logrotate -d /etc/logrotate.d/lifeos
```

## Verifying Docker Log Caps

Docker's `json-file` driver caps are set in the compose files and enforced automatically. To inspect the current log size for a service:

```bash
# Check log file sizes for all containers
docker inspect --format='{{.LogPath}}' lifeos-api | xargs ls -lh
docker inspect --format='{{.LogPath}}' lifeos-caddy | xargs ls -lh

# Or check all at once
for name in lifeos-api lifeos-caddy lifeos-web lifeos-postgres; do
  path=$(docker inspect --format='{{.LogPath}}' "$name" 2>/dev/null)
  [ -n "$path" ] && echo "$name: $(ls -lh $path 2>/dev/null | awk '{print $5}')"
done
```

## Checking Disk Pressure

```bash
# Overall disk usage
df -h /var/lib/docker /var/log

# Container log sizes
du -sh /var/lib/docker/containers/

# Host log directory
du -sh /var/log/life-os/
```

If `HostDiskPressure` (>85%) or `HostDiskCritical` (>95%) Prometheus alerts fire, follow the runbook in `docs/58-MONITORING-AND-ALERTING.md §8.12`.
