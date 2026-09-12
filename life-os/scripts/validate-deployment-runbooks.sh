#!/usr/bin/env bash
# validate-deployment-runbooks.sh — Verify LOS-1612 deployment and rollback runbooks artefacts
#
# Specification: life-os/docs/60-DEPLOYMENT-AND-ROLLBACK-RUNBOOKS.md
#
# Usage:
#   sh life-os/scripts/validate-deployment-runbooks.sh           # full check
#   sh life-os/scripts/validate-deployment-runbooks.sh --dry-run # check without modifying anything

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LIFE_OS="$REPO_ROOT/life-os"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

FAILURES=0
SECTION=0

section() {
  SECTION=$((SECTION + 1))
  echo ""
  echo "=== Section $SECTION: $1 ==="
}

pass() { echo "  [PASS] $1"; }
fail() { echo "  [FAIL] $1" >&2; FAILURES=$((FAILURES + 1)); }

assert_file_exists() {
  local path="$1"
  local label="${2:-$path}"
  if [[ -f "$path" ]]; then
    pass "File exists: $label"
  else
    fail "File missing: $label"
  fi
}

assert_file_contains() {
  local path="$1"
  local pattern="$2"
  local label="${3:-contains '$pattern'}"
  if grep -qF "$pattern" "$path" 2>/dev/null; then
    pass "$label"
  else
    fail "File '$path' does not contain: $pattern"
  fi
}

assert_executable() {
  local path="$1"
  local label="${2:-$path}"
  if [[ -x "$path" ]]; then
    pass "Executable: $label"
  else
    fail "Not executable: $label"
  fi
}

# ---------------------------------------------------------------------------
# Section 1: Specification document
# ---------------------------------------------------------------------------
section "Specification document"

SPEC_DOC="$LIFE_OS/docs/60-DEPLOYMENT-AND-ROLLBACK-RUNBOOKS.md"
assert_file_exists "$SPEC_DOC" "docs/60-DEPLOYMENT-AND-ROLLBACK-RUNBOOKS.md"
assert_file_contains "$SPEC_DOC" "LOS-1612" "spec: LOS-1612 ticket reference present"
assert_file_contains "$SPEC_DOC" "Target environment safety matrix" "spec: target safety matrix documented"
assert_file_contains "$SPEC_DOC" "Normal deployment runbook" "spec: normal deployment runbook documented"
assert_file_contains "$SPEC_DOC" "Failed migration rollback" "spec: failed migration runbook documented"
assert_file_contains "$SPEC_DOC" "Bad application rollout" "spec: bad application rollback runbook documented"
assert_file_contains "$SPEC_DOC" "Database disaster recovery" "spec: database restore runbook documented"
assert_file_contains "$SPEC_DOC" "Application files disaster recovery" "spec: application files restore runbook documented"
assert_file_contains "$SPEC_DOC" "Cloudflare bypass" "spec: Cloudflare bypass / emergency access documented"
assert_file_contains "$SPEC_DOC" "TLS certificate renewal" "spec: TLS certificate renewal runbook documented"
assert_file_contains "$SPEC_DOC" "secrets rotation" "spec: secrets rotation runbooks documented"
assert_file_contains "$SPEC_DOC" "Incident management" "spec: incident escalation matrix documented"

# ---------------------------------------------------------------------------
# Section 2: Normal deployment pipeline & target checks
# ---------------------------------------------------------------------------
section "Normal deployment pipeline & target checks"

DEPLOY_SCRIPT="$LIFE_OS/scripts/deploy-pipeline.sh"
assert_file_exists "$DEPLOY_SCRIPT" "scripts/deploy-pipeline.sh"
assert_executable "$DEPLOY_SCRIPT" "scripts/deploy-pipeline.sh"
assert_file_contains "$DEPLOY_SCRIPT" "TARGET_ENV" "deploy script: supports target environment validation"
assert_file_contains "$DEPLOY_SCRIPT" "RELEASE_TAG" "deploy script: supports immutable release tag"
assert_file_contains "$DEPLOY_SCRIPT" "deployments.json" "deploy script: logs secret-safe audit record"

if sh "$DEPLOY_SCRIPT" --target=staging --dry-run >/dev/null 2>&1; then
  pass "deploy script: staging dry-run passed"
else
  fail "deploy script: staging dry-run failed"
fi

if sh "$DEPLOY_SCRIPT" --target=production --tag=v1.0.0 --dry-run >/dev/null 2>&1; then
  pass "deploy script: production dry-run passed"
else
  fail "deploy script: production dry-run failed"
fi

# ---------------------------------------------------------------------------
# Section 3: Failed migration recovery procedures
# ---------------------------------------------------------------------------
section "Failed migration recovery procedures"

assert_file_contains "$SPEC_DOC" "flyway_schema_history" "spec: schema history inspection documented"
assert_file_contains "$SPEC_DOC" "Flyway repair" "spec: Flyway repair option documented"
assert_file_contains "$SPEC_DOC" "Option B: Schema rollback" "spec: partial DDL schema rollback documented"

# ---------------------------------------------------------------------------
# Section 4: Bad application rollback automation & script
# ---------------------------------------------------------------------------
section "Bad application rollback automation & script"

ROLLBACK_SCRIPT="$LIFE_OS/scripts/rollback-release.sh"
assert_file_exists "$ROLLBACK_SCRIPT" "scripts/rollback-release.sh"

if [[ ! -x "$ROLLBACK_SCRIPT" ]]; then
  if [[ "$DRY_RUN" == false ]]; then
    chmod +x "$ROLLBACK_SCRIPT"
    pass "scripts/rollback-release.sh — made executable"
  else
    fail "scripts/rollback-release.sh — not executable (would chmod +x in non-dry-run)"
  fi
else
  assert_executable "$ROLLBACK_SCRIPT" "scripts/rollback-release.sh"
fi

assert_file_contains "$ROLLBACK_SCRIPT" "TARGET_ENV" "rollback script: supports target environment validation"
assert_file_contains "$ROLLBACK_SCRIPT" "ROLLBACK_TAG" "rollback script: supports rollback tag parameter"
assert_file_contains "$ROLLBACK_SCRIPT" "deployments.json" "rollback script: logs rollback audit record"

if sh "$ROLLBACK_SCRIPT" --target=staging --dry-run >/dev/null 2>&1; then
  pass "rollback script: staging dry-run passed"
else
  fail "rollback script: staging dry-run failed"
fi

if sh "$ROLLBACK_SCRIPT" --target=production --tag=v0.9.9 --dry-run >/dev/null 2>&1; then
  pass "rollback script: production dry-run passed"
else
  fail "rollback script: production dry-run failed"
fi

# ---------------------------------------------------------------------------
# Section 5: Database disaster recovery runbook integration
# ---------------------------------------------------------------------------
section "Database disaster recovery runbook integration"

RESTORE_PG_SCRIPT="$LIFE_OS/scripts/restore-postgres-backup.sh"
assert_file_exists "$RESTORE_PG_SCRIPT" "scripts/restore-postgres-backup.sh"
assert_executable "$RESTORE_PG_SCRIPT" "scripts/restore-postgres-backup.sh"
assert_file_contains "$SPEC_DOC" "restore-postgres-backup.sh" "spec: references restore-postgres-backup.sh"
assert_file_contains "$SPEC_DOC" "BACKUP_ENCRYPTION_PASSPHRASE" "spec: references BACKUP_ENCRYPTION_PASSPHRASE"
assert_file_contains "$SPEC_DOC" "RPO" "spec: RPO targets defined"
assert_file_contains "$SPEC_DOC" "RTO" "spec: RTO targets defined"

# ---------------------------------------------------------------------------
# Section 6: Application files disaster recovery runbook integration
# ---------------------------------------------------------------------------
section "Application files disaster recovery runbook integration"

RESTORE_FILES_SCRIPT="$LIFE_OS/scripts/restore-app-files-backup.sh"
assert_file_exists "$RESTORE_FILES_SCRIPT" "scripts/restore-app-files-backup.sh"
assert_executable "$RESTORE_FILES_SCRIPT" "scripts/restore-app-files-backup.sh"
assert_file_contains "$SPEC_DOC" "restore-app-files-backup.sh" "spec: references restore-app-files-backup.sh"
assert_file_contains "$SPEC_DOC" "Database restoration MUST execute FIRST" "spec: enforces DB-first restore ordering"

# ---------------------------------------------------------------------------
# Section 7: Cloudflare bypass and emergency access procedures
# ---------------------------------------------------------------------------
section "Cloudflare bypass and emergency access procedures"

assert_file_contains "$SPEC_DOC" "srv1883798.hstgr.cloud" "spec: VPS host target documented"
assert_file_contains "$SPEC_DOC" "Pause Cloudflare on Site" "spec: Cloudflare pause procedure documented"
assert_file_contains "$SPEC_DOC" "Under Attack Mode" "spec: Cloudflare Under Attack Mode documented"
assert_file_contains "$SPEC_DOC" "127.0.0.1:8443" "spec: direct loopback curl command documented"

# ---------------------------------------------------------------------------
# Section 8: TLS certificate renewal and Caddy reload procedures
# ---------------------------------------------------------------------------
section "TLS certificate renewal and Caddy reload procedures"

assert_file_contains "$SPEC_DOC" "Origin CA Certificate" "spec: Origin CA certificate procedures documented"
assert_file_contains "$SPEC_DOC" "caddy reload" "spec: zero-downtime Caddy reload documented"
assert_file_contains "$SPEC_DOC" "chmod 600" "spec: private key permission guard documented"

# ---------------------------------------------------------------------------
# Section 9: Secrets rotation runbooks & non-logging contract
# ---------------------------------------------------------------------------
section "Secrets rotation runbooks & non-logging contract"

assert_file_contains "$SPEC_DOC" "POSTGRES_PASSWORD" "spec: Postgres password rotation documented"
assert_file_contains "$SPEC_DOC" "JWT_SECRET" "spec: JWT secret rotation documented"
assert_file_contains "$SPEC_DOC" "CSRF_SECRET" "spec: CSRF secret rotation documented"
assert_file_contains "$SPEC_DOC" "CLOUDFLARE_API_TOKEN" "spec: Cloudflare token rotation documented"
assert_file_contains "$SPEC_DOC" "SSH Deploy Keys" "spec: SSH key rotation documented"

# ---------------------------------------------------------------------------
# Section 10: Incident management, escalation matrix, & PIR
# ---------------------------------------------------------------------------
section "Incident management, escalation matrix, & PIR"

assert_file_contains "$SPEC_DOC" "P0 — Critical" "spec: P0 severity SLA documented"
assert_file_contains "$SPEC_DOC" "P1 — High" "spec: P1 severity SLA documented"
assert_file_contains "$SPEC_DOC" "partha@buildwithpartha.tech" "spec: primary contact documented"
assert_file_contains "$SPEC_DOC" "Post-Incident Review" "spec: Post-Incident Review template documented"

# ---------------------------------------------------------------------------
# Section 11: Documentation and backlog updates
# ---------------------------------------------------------------------------
section "Documentation and backlog updates"

BACKLOG="$LIFE_OS/docs/backlog/EPIC-16-INFRA-LAUNCH.md"
assert_file_exists "$BACKLOG" "docs/backlog/EPIC-16-INFRA-LAUNCH.md"
assert_file_contains "$BACKLOG" "LOS-1612" "backlog: LOS-1612 entry exists"
assert_file_contains "$BACKLOG" "Done" "backlog: LOS-1612 marked Done"

HANDOFF="$LIFE_OS/docs/handoffs/LOS-1612.md"
assert_file_exists "$HANDOFF" "docs/handoffs/LOS-1612.md"
assert_file_contains "$HANDOFF" "LOS-1612" "handoff: references LOS-1612"

CURRENT_STATUS="$LIFE_OS/docs/CURRENT-STATUS.md"
assert_file_exists "$CURRENT_STATUS" "docs/CURRENT-STATUS.md"
assert_file_contains "$CURRENT_STATUS" "LOS-1612" "CURRENT-STATUS: LOS-1612 entry present"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
if [[ $FAILURES -eq 0 ]]; then
  echo "  validate-deployment-runbooks.sh: ALL CHECKS PASSED (0 failures)"
  echo "============================================================"
  exit 0
else
  echo "  validate-deployment-runbooks.sh: $FAILURES FAILURE(S) DETECTED"
  echo "============================================================"
  exit 1
fi
