# LifeOS deployment, rollback, and disaster recovery runbooks

- Status: Accepted
- Date: 2026-09-12
- Ticket: [LOS-1612](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-1607](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/41-DEPLOYMENT-PIPELINE.md), [LOS-1608](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/42-POSTGRESQL-BACKUP-AND-RESTORE.md), [LOS-1609](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/43-APPLICATION-DATA-AND-FILE-BACKUP.md), [LOS-1610](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/58-MONITORING-AND-ALERTING.md), [LOS-1611](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/59-CENTRALIZED-SAFE-LOGS.md)

---

## 1. Executive summary & target safety framework

This specification establishes the standard operating procedures (SOPs), emergency response workflows, and disaster recovery runbooks for LifeOS across staging (`staging.buildwithpartha.tech`) and production (`buildwithpartha.tech`).

All production operations, rollbacks, and recovery actions are governed by strict safety principles:
1. **Target environment verification**: Every destructive or state-changing command MUST validate that the intended environment (`TARGET_ENV=staging|production`) matches the target host, container names, volumes, and configuration files before execution.
2. **Deterministic execution**: All deployments and rollbacks use immutable container image tags (`lifeos-web:<tag>`, `lifeos-api:<tag>`) and verified checksums. Floating tags (e.g. `latest`) are forbidden.
3. **Secret-safe execution**: Runbooks strictly prohibit echoing, logging, or passing unredacted credentials to terminal logs or deployment ledgers.
4. **Data preservation first**: Backward-compatible schema evolution ensures application code can roll back to a previous release without requiring destructive database schema rollbacks.

### Target environment safety matrix:

| Parameter | Staging (`staging`) | Production (`production`) | Safety Check Command |
| :--- | :--- | :--- | :--- |
| **Domain** | `staging.buildwithpartha.tech` | `buildwithpartha.tech` | `curl -sI https://$DOMAIN/life-os/` |
| **Host** | `srv1883798.hstgr.cloud` | `srv1883798.hstgr.cloud` | `hostname` |
| **Compose File** | `infra/compose/compose.staging.yml` | `infra/compose/compose.prod.yml` | `test -f $COMPOSE_FILE` |
| **Secrets File** | `/etc/life-os/secrets/.env.staging` | `/etc/life-os/secrets/.env.production` | `test -f $SECRETS_FILE && stat -c %a $SECRETS_FILE` (must be `600`) |
| **DB Container** | `lifeos-staging-postgres` | `lifeos-prod-postgres` | `docker ps -f name=$DB_CONTAINER` |
| **DB Name / User** | `lifeos_staging` / `lifeos_app` | `lifeos_prod` / `lifeos_app` | `docker exec $DB_CONTAINER psql -U postgres -l` |
| **API Container** | `lifeos-staging-api` | `lifeos-prod-api` | `docker ps -f name=$API_CONTAINER` |
| **Web Container** | `lifeos-staging-web` | `lifeos-prod-web` | `docker ps -f name=$WEB_CONTAINER` |
| **Caddy Container** | `lifeos-staging-caddy` | `lifeos-prod-caddy` | `docker ps -f name=$CADDY_CONTAINER` |
| **Backup Storage** | `/opt/life-os/backups/staging` | `/opt/life-os/backups/production` | `test -d $BACKUP_DIR` |
| **Audit Ledger** | `/var/log/life-os/deployments.json` | `/var/log/life-os/deployments.json` | `test -f /var/log/life-os/deployments.json` |

---

## 2. Normal deployment runbook

The standard deployment lifecycle promotes tested release candidates from `develop` through staging to production on `master` with pre-rollout migrations, zero-downtime rolling container updates, health probes, and audit logging.

```
[CI Build & Test] ──> [Immutable Images & SBOM] ──> [Staging Deploy & Smoke] ──> [Owner Approval Gate] ──> [Production Deploy] ──> [Health Verification & Audit Log]
```

### 2.1 Pre-deployment checklist
- [ ] All CI tests, linters, and security scans passed on `develop` or `master`.
- [ ] Working tree clean; semantic version tag (`vX.Y.Z`) created on `master`.
- [ ] Host disk space verified (`df -h /` has $> 20\%$ free capacity).
- [ ] Nightly PostgreSQL and file backups verified within past 26 hours via Prometheus `lifeos_backup_last_success_timestamp_seconds`.

### 2.2 Staging deployment execution

```bash
# Target Environment: STAGING
export TARGET_ENV="staging"
export RELEASE_TAG="$(git rev-parse --short HEAD)"

# 1. Target check
if [ "$TARGET_ENV" != "staging" ]; then echo "Invalid target environment: $TARGET_ENV" >&2; exit 1; fi

# 2. Run staging deployment pipeline
sh life-os/scripts/deploy-pipeline.sh --target=staging --tag="$RELEASE_TAG"

# 3. Verify staging smoke tests
sh life-os/scripts/validate-staging-environment.sh --dry-run
curl -fsS "https://staging.buildwithpartha.tech/life-os/api/v1/actuator/health" | grep -q '"status":"UP"'
```

### 2.3 Production deployment execution

```bash
# Target Environment: PRODUCTION
export TARGET_ENV="production"
export RELEASE_TAG="v1.0.0" # Must be immutable semantic tag or release commit SHA

# 1. Target check
if [ "$TARGET_ENV" != "production" ]; then echo "Invalid target environment: $TARGET_ENV" >&2; exit 1; fi

# 2. Verify VPS host environment
test "$(hostname)" = "srv1883798.hstgr.cloud" || echo "Warning: unexpected hostname $(hostname)"

# 3. Run production deployment pipeline
sh life-os/scripts/deploy-pipeline.sh --target=production --tag="$RELEASE_TAG"

# 4. Post-deployment smoke & health verification
curl -fsS "https://buildwithpartha.tech/life-os/api/v1/actuator/health" | grep -q '"status":"UP"'
curl -fsS "https://buildwithpartha.tech/life-os/api/v1/actuator/health/readiness" | grep -q '"status":"UP"'
curl -sI "https://buildwithpartha.tech/life-os/" | grep -q "200 OK"

# 5. Verify deployment audit record
tail -n 1 /var/log/life-os/deployments.json | grep "$RELEASE_TAG"
```

---

## 3. Failed migration rollback & recovery runbook

Database schema migrations (`flyway migrate`) execute **prior** to updating API runtime containers. If a migration script fails, the deployment pipeline halts before updating application containers.

### 3.1 Failure detection & triage
- Pipeline logs report `FlywayException` or SQL execution failure.
- API containers remain on the previous release version; database is locked or left in a failed migration state (`success = false` in `flyway_schema_history`).

### 3.2 Triage & containment procedure

```bash
# Target environment check
export TARGET_ENV="production"
export COMPOSE_FILE="life-os/infra/compose/compose.prod.yml"
export DB_CONTAINER="lifeos-prod-postgres"

# 1. Target check
if [ "$TARGET_ENV" != "production" ]; then echo "Abort: target is not production" >&2; exit 1; fi

# 2. Inspect failing migration entry in flyway_schema_history
docker exec -i "$DB_CONTAINER" psql -U postgres -d lifeos_prod -c \
  "SELECT installed_rank, version, description, type, script, installed_on, execution_time, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"

# 3. Identify root cause: syntax error, constraint violation, lock timeout, or out-of-order execution
```

### 3.3 Recovery & repair options

#### Option A: Migration repair (non-destructive SQL fix)
When the migration failed before altering data or schema:
1. Fix the SQL script in `life-os/apps/api/src/main/resources/db/migration/V<N>__<name>.sql`.
2. Clear the failed migration checksum from the schema history table:
   ```bash
   # Run Flyway repair via temporary runner or psql admin query
   docker exec -i "$DB_CONTAINER" psql -U postgres -d lifeos_prod -c \
     "DELETE FROM flyway_schema_history WHERE version = '<N>' AND success = false;"
   ```
3. Re-run deployment pipeline to apply the corrected migration cleanly.

#### Option B: Schema rollback (when DDL partially applied)
1. Manually revert any partially applied DDL (e.g. `DROP TABLE`, `DROP COLUMN`, `ALTER TABLE ... DROP CONSTRAINT`) using safe, reversible statements.
2. Remove the failed row from `flyway_schema_history`.
3. Verify database integrity and re-run the pipeline.

#### Option C: Full database restoration (catastrophic corruption)
If partial migration caused irreversible data corruption, execute the **Database Disaster Recovery Runbook (§5)**.

---

## 4. Bad application rollout (bad app) rollback runbook

A bad application rollout occurs when containers deploy successfully, but post-deploy observation reveals severe regressions (e.g. 5xx errors $> 1\%$, crash loops, broken user authentication, or memory leaks).

### 4.1 Rapid container rollback execution

```bash
# Target environment check
export TARGET_ENV="production"
export PREVIOUS_TAG="v0.9.9" # Specify previous known-good tag

# 1. Execute automated rollback script with target check
sh life-os/scripts/rollback-release.sh --target=production --tag="$PREVIOUS_TAG"

# 2. Verify rollback container health
curl -fsS "https://buildwithpartha.tech/life-os/api/v1/actuator/health" | grep -q '"status":"UP"'
curl -sI "https://buildwithpartha.tech/life-os/" | grep -q "200 OK"

# 3. Verify error rate stabilization in Prometheus
# Prometheus query: sum(rate(lifeos_http_requests_total{status=~"5.."}[5m])) / sum(rate(lifeos_http_requests_total[5m])) < 0.01
```

### 4.2 Manual rollback fallback commands

If the automated script is unavailable:

```bash
# 1. Target checks
TARGET_ENV="production"
test "$TARGET_ENV" = "production" || exit 1
COMPOSE_FILE="life-os/infra/compose/compose.prod.yml"

# 2. Update image tags in environment override
export WEB_IMAGE="lifeos-web:$PREVIOUS_TAG"
export API_IMAGE="lifeos-api:$PREVIOUS_TAG"

# 3. Recreate containers with previous images
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans web api

# 4. Confirm container statuses
docker compose -f "$COMPOSE_FILE" ps
```

---

## 5. Database disaster recovery & restore runbook

This runbook details full disaster recovery using AES-256 GPG encrypted backups created by `backup-postgres.sh` per [42-POSTGRESQL-BACKUP-AND-RESTORE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/42-POSTGRESQL-BACKUP-AND-RESTORE.md).

- **RPO (Recovery Point Objective)**: 24 hours (nightly automated snapshot at 02:00 UTC).
- **RTO (Recovery Time Objective)**: $< 15\text{ minutes}$ ($< 5\text{ s}$ automated script / $\approx 3\text{ min}$ operator execution).

### 5.1 Step-by-step restoration procedure

```bash
# Target Environment: PRODUCTION
export TARGET_ENV="production"
export DB_CONTAINER="lifeos-prod-postgres"
export BACKUP_DIR="/opt/life-os/backups/production"

# 1. Target validation guard
if [ "$TARGET_ENV" != "production" ]; then echo "Target must be production" >&2; exit 1; fi

# 2. Stop application traffic to prevent concurrent writes during restore
docker compose -f life-os/infra/compose/compose.prod.yml stop api

# 3. Identify latest valid encrypted backup file
LATEST_BACKUP="$(ls -t "$BACKUP_DIR"/lifeos_prod_backup_*.sql.gz.gpg 2>/dev/null | head -n 1)"
echo "[*] Restoring from backup: $LATEST_BACKUP"

# 4. Retrieve BACKUP_ENCRYPTION_PASSPHRASE from secure out-of-band vault (e.g. Bitwarden/1Password)
# Prompt operator securely without logging:
read -s -p "Enter BACKUP_ENCRYPTION_PASSPHRASE: " BACKUP_ENCRYPTION_PASSPHRASE
echo ""

# 5. Execute automated restore script
BACKUP_ENCRYPTION_PASSPHRASE="$BACKUP_ENCRYPTION_PASSPHRASE" \
  sh life-os/scripts/restore-postgres-backup.sh --backup="$LATEST_BACKUP" --target=production

# 6. Replay account deletion ledger post-restoration (DPDP / GDPR compliance per ADR-012)
docker exec -i "$DB_CONTAINER" psql -U postgres -d lifeos_prod -c \
  "SELECT user_id, requested_at, status FROM account_deletion_requests WHERE status = 'PURGED';"

# 7. Restart API container
docker compose -f life-os/infra/compose/compose.prod.yml start api

# 8. Post-restoration verification
curl -fsS "https://buildwithpartha.tech/life-os/api/v1/actuator/health" | grep -q '"status":"UP"'
```

---

## 6. Application files disaster recovery & restore runbook

Restores user attachments and data files created by `backup-app-files.sh` per [43-APPLICATION-DATA-AND-FILE-BACKUP.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/43-APPLICATION-DATA-AND-FILE-BACKUP.md).

> [!IMPORTANT]
> **Restore Ordering**: Database restoration MUST execute FIRST (§5). Application files restoration executes SECOND (§6).

### 6.1 Step-by-step file restore procedure

```bash
# Target Environment: PRODUCTION
export TARGET_ENV="production"
export FILE_BACKUP_DIR="/opt/life-os/backups/production/files"

# 1. Target check
if [ "$TARGET_ENV" != "production" ]; then echo "Target must be production" >&2; exit 1; fi

# 2. Identify latest file backup
LATEST_FILE_BACKUP="$(ls -t "$FILE_BACKUP_DIR"/lifeos_files_backup_*.tar.gz.gpg 2>/dev/null | head -n 1)"

# 3. Retrieve passphrase securely
read -s -p "Enter BACKUP_ENCRYPTION_PASSPHRASE: " BACKUP_ENCRYPTION_PASSPHRASE
echo ""

# 4. Execute restore script
BACKUP_ENCRYPTION_PASSPHRASE="$BACKUP_ENCRYPTION_PASSPHRASE" \
  sh life-os/scripts/restore-app-files-backup.sh --backup="$LATEST_FILE_BACKUP" --target=production

# 5. Post-restore orphan reconciliation check
# Verifies that every attachment file on disk has a corresponding database metadata row
```

---

## 7. Cloudflare bypass & emergency origin access runbook

When Cloudflare proxying experiences an outage, WAF lockouts occur, or direct origin inspection is required:

### 7.1 Emergency VPS direct SSH access
- Primary SSH: `ssh -i ~/.ssh/id_ed25519 lifeos-deploy@srv1883798.hstgr.cloud`
- Emergency Hostinger Serial Console: Access Hostinger Cloud VPS Dashboard $\rightarrow$ Web Console (bypass SSH).

### 7.2 Direct origin loopback health checks

```bash
# Target host check
test "$(hostname)" = "srv1883798.hstgr.cloud" || echo "Warning: not on VPS"

# Probe Caddy ingress on loopback bypassing Cloudflare
curl -k -H "Host: buildwithpartha.tech" https://127.0.0.1:8443/life-os/api/v1/actuator/health
curl -k -H "Host: buildwithpartha.tech" https://127.0.0.1:8443/life-os/
```

### 7.3 Cloudflare emergency control actions

1. **Pause Cloudflare on Site**:
   - Cloudflare Dashboard $\rightarrow$ Domain `buildwithpartha.tech` $\rightarrow$ Overview $\rightarrow$ Advanced Actions $\rightarrow$ "Pause Cloudflare on Site".
   - Bypasses Cloudflare CDN/WAF and routes DNS directly to origin (requires origin port 80/443 open in UFW).
2. **Under Attack Mode**:
   - Cloudflare Dashboard $\rightarrow$ Security $\rightarrow$ Settings $\rightarrow$ Security Level $\rightarrow$ "I'm Under Attack!".
   - Enforces JavaScript challenges on all incoming requests during DDoS events.
3. **Emergency UFW firewall adjustment** (if direct origin access needed):
   ```bash
   # Add temporary operator IP to UFW
   sudo ufw allow from <OPERATOR_IP> to any port 443 proto tcp comment "Emergency operator access"
   ```

---

## 8. TLS certificate renewal & replacement runbook

LifeOS uses Cloudflare Origin CA certificates between Cloudflare Edge and the Caddy ingress container (`Full (strict)` mode).

### 8.1 Routine renewal ($< 14$ days alert) & emergency replacement

```bash
# Target host check
test "$(hostname)" = "srv1883798.hstgr.cloud" || echo "Warning: not on VPS"

# 1. Generate new Origin CA Certificate in Cloudflare Dashboard:
#    SSL/TLS -> Origin Server -> Create Certificate -> Key type: RSA (2048) or ECC -> Validity: 15 years

# 2. Stage new certificates securely on VPS
sudo mkdir -p /etc/ssl/lifeos
sudo tee /etc/ssl/lifeos/origin.pem > /dev/null << 'EOF'
# Paste Origin Certificate PEM content
EOF

sudo tee /etc/ssl/lifeos/origin.key > /dev/null << 'EOF'
# Paste Private Key PEM content
EOF

# 3. Enforce strict permissions
sudo chmod 644 /etc/ssl/lifeos/origin.pem
sudo chmod 600 /etc/ssl/lifeos/origin.key
sudo chown root:root /etc/ssl/lifeos/origin.*

# 4. Zero-downtime Caddy reload
docker exec lifeos-prod-caddy caddy reload --config /etc/caddy/Caddyfile

# 5. Verify TLS handshake
openssl s_client -connect 127.0.0.1:8443 -servername buildwithpartha.tech </dev/null 2>/dev/null | openssl x509 -noout -dates
```

---

## 9. Routine & emergency secrets rotation runbooks

Per [36-PRODUCTION-CONFIGURATION-AND-SECRETS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md), secrets follow strict rotation cycles:

| Secret Key | Routine Frequency | Rotation Method | Impact / Downtime |
| :--- | :--- | :--- | :--- |
| `POSTGRES_PASSWORD` | 180 days | Dual-role password change | Zero downtime |
| `JWT_SECRET` | 90 days | Dual-key grace or active session reset | Graceful / sessions re-authenticated |
| `CSRF_SECRET` | 180 days | Update `.env` & restart API | $< 5\text{ s}$ restart |
| `BACKUP_ENCRYPTION_PASSPHRASE` | 365 days | Update in vault & script | Zero downtime (future backups use new key) |
| `CLOUDFLARE_API_TOKEN` | 90 days | Cloudflare dashboard regenerate | Zero downtime |
| SSH Deploy Keys | 365 days | Append new key $\rightarrow$ verify $\rightarrow$ remove old | Zero downtime |

### 9.1 Emergency secret rotation procedure (credential compromise)

```bash
# 1. Target check
export TARGET_ENV="production"
export SECRETS_FILE="/etc/life-os/secrets/.env.production"

# 2. Generate new cryptographically secure 256-bit secret
NEW_JWT_SECRET="$(openssl rand -base64 32)"
NEW_CSRF_SECRET="$(openssl rand -base64 32)"

# 3. Atomically update secrets file with safe permissions (0600)
# Update key values in $SECRETS_FILE

# 4. Restart affected containers to ingest new secret
docker compose -f life-os/infra/compose/compose.prod.yml up -d --force-recreate api

# 5. Validate health without logging secret values
curl -fsS "https://buildwithpartha.tech/life-os/api/v1/actuator/health" | grep -q '"status":"UP"'
```

---

## 10. Incident management, escalation matrix & contact paths

### 10.1 Severity classification & SLA response times

| Severity | Definition | Response SLA | Resolution SLA | Notification Channel |
| :--- | :--- | :--- | :--- | :--- |
| **P0 — Critical** | Complete service outage, data corruption, or verified security breach | $< 15\text{ minutes}$ | $< 2\text{ hours}$ | Phone / Signal / Critical Alert |
| **P1 — High** | Core user journey blocked (Login, Today, Projects, Tasks), $> 5\%$ error rate | $< 30\text{ minutes}$ | $< 6\text{ hours}$ | Signal / Alertmanager Email |
| **P2 — Medium** | Degraded performance, non-critical feature failure, backup warning | $< 2\text{ hours}$ | $< 24\text{ hours}$ | Alertmanager Email |
| **P3 — Low** | Minor cosmetic bug, non-blocking telemetry warning | $< 24\text{ hours}$ | Next Sprint | Issue Tracker |

### 10.2 Escalation contacts

| Role | Contact | Primary Channel | Secondary Channel |
| :--- | :--- | :--- | :--- |
| **Primary Engineering Owner** | Partha | Signal / Email (`partha@buildwithpartha.tech`) | Phone |
| **Hosting Provider (VPS)** | Hostinger Support | Hostinger Live Chat | Support Ticket |
| **Edge Provider (DNS/WAF)** | Cloudflare Support | Cloudflare Dashboard | Status Page (`cloudflarestatus.com`) |

### 10.3 Post-Incident Review (PIR) template

A Post-Incident Review document must be completed within 48 hours of any P0 or P1 incident:

```markdown
# Post-Incident Review: [INCIDENT-ID] - [Title]

- **Date**: YYYY-MM-DD
- **Severity**: P0 / P1
- **Duration**: XX minutes
- **Incident Commander**: [Owner Name]

## 1. Executive Summary
Brief non-technical overview of the event, impact, and root cause.

## 2. Timeline (UTC)
- `HH:MM` - Incident detected via Prometheus alert `[AlertName]`.
- `HH:MM` - Initial triage commenced; incident declared.
- `HH:MM` - Mitigation action applied (Runbook §X).
- `HH:MM` - Verification completed; service restored.

## 3. Root Cause Analysis (5 Whys)
Detailed analysis of the systemic root cause.

## 4. Corrective & Preventative Actions
- [ ] Action item 1 (Owner, Target Date, Ticket ID)
- [ ] Action item 2 (Owner, Target Date, Ticket ID)
```

---

## 11. Automated verification contract

The runbooks, scripts, and safety targets specified in this document are automatically validated by `life-os/scripts/validate-deployment-runbooks.sh`.

Validation covers:
1. Specification completeness and section hierarchy.
2. Target check assertion syntax in all scripts.
3. Automated rollback script (`life-os/scripts/rollback-release.sh`) syntax and dry-run execution.
4. Database and file restoration runbook integration.
5. Cloudflare emergency access and TLS certificate replacement procedures.
6. Incident escalation SLAs and contact matrices.
