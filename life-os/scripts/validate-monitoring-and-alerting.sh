#!/usr/bin/env bash
# validate-monitoring-and-alerting.sh
# Automated verification script for LOS-1610 — Add monitoring and alerting
# Specification: life-os/docs/58-MONITORING-AND-ALERTING.md §10
#
# Usage:
#   sh life-os/scripts/validate-monitoring-and-alerting.sh [--dry-run]
#
# Exit codes:
#   0 — all assertions passed
#   1 — one or more assertions failed

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── State ─────────────────────────────────────────────────────────────────────
DRY_RUN=false
PASS=0
FAIL=0
FAILURES=()

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
pass() { echo -e "${GREEN}  PASS${NC} — $1"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}  FAIL${NC} — $1"; FAIL=$((FAIL + 1)); FAILURES+=("$1"); }
info() { echo -e "${YELLOW}  INFO${NC} — $1"; }
header() { echo; echo "═══════════════════════════════════════"; echo "  $1"; echo "═══════════════════════════════════════"; }

# Root of the repository (relative to this script)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFRA="$REPO_ROOT/infra/monitoring"
API_SRC="$REPO_ROOT/apps/api/src"

header "LOS-1610 Monitoring and Alerting Verification"
[ "$DRY_RUN" = true ] && info "Running in DRY-RUN mode — no live connections attempted"

# ─────────────────────────────────────────────────────────────────────────────
# 1. Specification document exists
# ─────────────────────────────────────────────────────────────────────────────
header "1. Specification document"

if [ -f "$REPO_ROOT/docs/58-MONITORING-AND-ALERTING.md" ]; then
  pass "docs/58-MONITORING-AND-ALERTING.md exists"
else
  fail "docs/58-MONITORING-AND-ALERTING.md MISSING"
fi

# Check all required sections
for section in \
  "External uptime" \
  "TLS certificate expiry" \
  "5xx" \
  "DB/disk/CPU/memory\|database.*disk.*cpu\|Database, disk" \
  "backup age\|BackupAgeExceeded\|Backup Age" \
  "runbook\|Runbook" \
  "Alertmanager"; do
  if grep -qi "$section" "$REPO_ROOT/docs/58-MONITORING-AND-ALERTING.md" 2>/dev/null; then
    pass "Specification covers: $section"
  else
    fail "Specification missing section: $section"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 2. Prometheus configuration files
# ─────────────────────────────────────────────────────────────────────────────
header "2. Prometheus configuration"

if [ -f "$INFRA/prometheus/prometheus.yml" ]; then
  pass "prometheus/prometheus.yml exists"
else
  fail "prometheus/prometheus.yml MISSING"
fi

# Validate required scrape jobs
for job in "lifeos-api" "blackbox-external" "blackbox-internal" "blackbox-tls" "node" "postgres"; do
  if grep -q "job_name: \"$job\"" "$INFRA/prometheus/prometheus.yml" 2>/dev/null; then
    pass "Prometheus scrape job defined: $job"
  else
    fail "Prometheus scrape job missing: $job"
  fi
done

# Validate rule_files references
for rulefile in "uptime.yml" "api.yml" "database.yml" "system.yml" "jobs.yml"; do
  if grep -q "$rulefile" "$INFRA/prometheus/prometheus.yml" 2>/dev/null; then
    pass "Rule file referenced in prometheus.yml: $rulefile"
  else
    fail "Rule file NOT referenced in prometheus.yml: $rulefile"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 3. Alert rule files — existence and required fields
# ─────────────────────────────────────────────────────────────────────────────
header "3. Prometheus alert rules"

RULE_FILES=("uptime.yml" "api.yml" "database.yml" "system.yml" "jobs.yml")
REQUIRED_ALERTS=(
  "UptimeProbeDown"
  "ApiReadinessDown"
  "TLSExpiryWarning"
  "TLSExpiryCritical"
  "HighApi5xxErrorRate"
  "HighApiLatency"
  "AuthFailureSpike"
  "DbPoolSaturation"
  "DbConnectionsDown"
  "DbDiskHighUsage"
  "HostHighCpu"
  "HostHighMemory"
  "HostDiskPressure"
  "HostDiskCritical"
  "BackupAgeExceeded"
  "BackgroundJobDeadLetter"
  "MailSendFailureSpike"
)

for rulefile in "${RULE_FILES[@]}"; do
  filepath="$INFRA/prometheus/rules/$rulefile"
  if [ -f "$filepath" ]; then
    pass "Rule file exists: rules/$rulefile"
    # Check mandatory YAML keys
    for key in "alert:" "expr:" "for:" "severity:" "runbook_url:"; do
      if grep -q "$key" "$filepath" 2>/dev/null; then
        pass "  $rulefile contains '$key'"
      else
        fail "  $rulefile missing '$key'"
      fi
    done
  else
    fail "Rule file MISSING: rules/$rulefile"
  fi
done

# Check each required alert is defined
for alert in "${REQUIRED_ALERTS[@]}"; do
  found=false
  for rulefile in "${RULE_FILES[@]}"; do
    if grep -q "alert: $alert" "$INFRA/prometheus/rules/$rulefile" 2>/dev/null; then
      found=true
      break
    fi
  done
  if [ "$found" = true ]; then
    pass "Alert rule defined: $alert"
  else
    fail "Alert rule MISSING: $alert"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 4. Blackbox Exporter configuration
# ─────────────────────────────────────────────────────────────────────────────
header "4. Blackbox Exporter configuration"

if [ -f "$INFRA/blackbox/blackbox.yml" ]; then
  pass "blackbox/blackbox.yml exists"
else
  fail "blackbox/blackbox.yml MISSING"
fi

for module in "http_2xx_follow_redirects" "http_2xx" "tls_connect"; do
  if grep -q "$module" "$INFRA/blackbox/blackbox.yml" 2>/dev/null; then
    pass "Blackbox module defined: $module"
  else
    fail "Blackbox module missing: $module"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 5. Alertmanager configuration
# ─────────────────────────────────────────────────────────────────────────────
header "5. Alertmanager configuration"

if [ -f "$INFRA/alertmanager/alertmanager.yml" ]; then
  pass "alertmanager/alertmanager.yml exists"
else
  fail "alertmanager/alertmanager.yml MISSING"
fi

# Check routing covers critical and warning
for severity in "critical" "warning"; do
  if grep -q "severity = $severity\|severity: $severity" "$INFRA/alertmanager/alertmanager.yml" 2>/dev/null; then
    pass "Alertmanager routing covers severity: $severity"
  else
    fail "Alertmanager routing missing severity: $severity"
  fi
done

# Check inhibition rules exist
if grep -q "inhibit_rules" "$INFRA/alertmanager/alertmanager.yml" 2>/dev/null; then
  pass "Alertmanager inhibition rules defined"
else
  fail "Alertmanager inhibition rules MISSING"
fi

# Check no real credentials in config (should use env var placeholders)
# Values must contain ${ indicating an env var substitution; quoted values like "${VAR}" are acceptable.
if grep -E '^\s*(smtp_auth_password|DATA_SOURCE_NAME):' "$INFRA/alertmanager/alertmanager.yml" 2>/dev/null \
    | grep -qvE '\$\{[A-Z_]+\}'; then
  fail "Alertmanager config may contain hardcoded credentials — use env var placeholders"
else
  pass "Alertmanager credentials use env var placeholders (no hardcoded secrets)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 6. Monitoring compose overlay
# ─────────────────────────────────────────────────────────────────────────────
header "6. Monitoring Docker Compose overlay"

COMPOSE_FILE="$REPO_ROOT/infra/compose/compose.monitoring.yml"

if [ -f "$COMPOSE_FILE" ]; then
  pass "compose.monitoring.yml exists"
else
  fail "compose.monitoring.yml MISSING"
fi

for service in "prometheus" "alertmanager" "blackbox-exporter" "node-exporter" "postgres-exporter"; do
  if grep -q "$service:" "$COMPOSE_FILE" 2>/dev/null; then
    pass "Compose overlay defines service: $service"
  else
    fail "Compose overlay missing service: $service"
  fi
done

# Verify pinned image versions (no :latest)
if grep -q ":latest" "$COMPOSE_FILE" 2>/dev/null; then
  fail "Compose overlay contains unpinned ':latest' image — use exact version tags"
else
  pass "Compose overlay uses pinned image versions (no :latest)"
fi

# Verify no externally exposed ports
if grep -E '^\s+ports:' "$COMPOSE_FILE" 2>/dev/null | grep -v '#'; then
  # Check that any port bindings are localhost-only or absent
  if grep -A2 'ports:' "$COMPOSE_FILE" 2>/dev/null | grep -qE '"[0-9]+:[0-9]+"' ; then
    fail "Monitoring compose exposes ports externally — monitoring services must be internal-only"
  else
    pass "Monitoring compose port bindings are acceptable"
  fi
else
  pass "Monitoring compose services have no externally exposed ports"
fi

# Verify no-new-privileges and non-root users
if grep -q "no-new-privileges:true" "$COMPOSE_FILE" 2>/dev/null; then
  pass "Monitoring compose applies no-new-privileges security option"
else
  fail "Monitoring compose missing no-new-privileges security option"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 7. BackupStatusMetricsProvider Java class
# ─────────────────────────────────────────────────────────────────────────────
header "7. BackupStatusMetricsProvider implementation"

PROVIDER="$API_SRC/main/java/tech/buildwithpartha/lifeos/common/metrics/BackupStatusMetricsProvider.java"
PROVIDER_TEST="$API_SRC/test/java/tech/buildwithpartha/lifeos/common/metrics/BackupStatusMetricsProviderTests.java"

if [ -f "$PROVIDER" ]; then
  pass "BackupStatusMetricsProvider.java exists"
else
  fail "BackupStatusMetricsProvider.java MISSING"
fi

for check in \
  "MeterBinder" \
  "lifeos.backup.last_success_timestamp_seconds" \
  "backup_type.*postgres\|postgres.*backup_type" \
  "backup_type.*app_files\|app_files.*backup_type" \
  "last_success_epoch" \
  "return 0.0"; do
  if grep -qP "$check" "$PROVIDER" 2>/dev/null || grep -q "$check" "$PROVIDER" 2>/dev/null; then
    pass "  Provider implements: $check"
  else
    fail "  Provider missing: $check"
  fi
done

if [ -f "$PROVIDER_TEST" ]; then
  pass "BackupStatusMetricsProviderTests.java exists"
else
  fail "BackupStatusMetricsProviderTests.java MISSING"
fi

# Check test covers key scenarios
for scenario in \
  "returnsZeroWhenFileDoesNotExist\|returns.*0.0.*file\|file does not exist" \
  "returnsCorrectEpoch\|returns correct epoch" \
  "returnsZeroOnMalformedJson\|malformed" \
  "backupTypeTagsArePrivacySafe\|privacy\|PII"; do
  if grep -qi "$scenario" "$PROVIDER_TEST" 2>/dev/null; then
    pass "  Test covers scenario: $scenario"
  else
    fail "  Test missing scenario: $scenario"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 8. Monitoring secrets template
# ─────────────────────────────────────────────────────────────────────────────
header "8. Monitoring secrets template"

if [ -f "$INFRA/.env.monitoring.example" ]; then
  pass "infra/monitoring/.env.monitoring.example exists"
else
  fail "infra/monitoring/.env.monitoring.example MISSING"
fi

for var in "ALERTMANAGER_SMTP_HOST" "ALERTMANAGER_OWNER_EMAIL" "DATA_SOURCE_NAME"; do
  if grep -q "^$var=" "$INFRA/.env.monitoring.example" 2>/dev/null; then
    pass "  Example template contains: $var"
  else
    fail "  Example template missing: $var"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 9. Backlog and status docs updated
# ─────────────────────────────────────────────────────────────────────────────
header "9. Documentation updates"

if grep -q "LOS-1610" "$REPO_ROOT/docs/backlog/EPIC-16-INFRA-LAUNCH.md" 2>/dev/null; then
  if grep -q "LOS-1610.*Done\|Done.*LOS-1610" "$REPO_ROOT/docs/backlog/EPIC-16-INFRA-LAUNCH.md" 2>/dev/null; then
    pass "EPIC-16-INFRA-LAUNCH.md marks LOS-1610 as Done"
  else
    fail "EPIC-16-INFRA-LAUNCH.md does not mark LOS-1610 as Done"
  fi
else
  fail "LOS-1610 not found in EPIC-16-INFRA-LAUNCH.md"
fi

if grep -q "LOS-1610" "$REPO_ROOT/docs/CURRENT-STATUS.md" 2>/dev/null; then
  pass "CURRENT-STATUS.md references LOS-1610"
else
  fail "CURRENT-STATUS.md does not reference LOS-1610"
fi

if [ -f "$REPO_ROOT/docs/handoffs/LOS-1610.md" ]; then
  pass "docs/handoffs/LOS-1610.md exists"
else
  fail "docs/handoffs/LOS-1610.md MISSING"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Results
# ─────────────────────────────────────────────────────────────────────────────
header "Results"
echo ""
echo "  Total PASS: $PASS"
echo "  Total FAIL: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo -e "${RED}Failed assertions:${NC}"
  for f in "${FAILURES[@]}"; do
    echo -e "  ${RED}✗${NC} $f"
  done
  echo ""
  echo -e "${RED}Validation FAILED — $FAIL assertion(s) did not pass.${NC}"
  exit 1
else
  echo ""
  echo -e "${GREEN}All $PASS assertions passed — LOS-1610 monitoring and alerting verification complete.${NC}"
  exit 0
fi
