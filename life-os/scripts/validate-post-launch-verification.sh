#!/usr/bin/env sh

# ==============================================================================
# LifeOS Post-Launch Verification Audit Script (LOS-1616)
# ==============================================================================
# Audits post-launch verification specification, telemetry observation window,
# automated nightly backup verification, owner journey validation, alert thresholds,
# and integration test coverage.
# ==============================================================================

set -eu

DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run|--test)
      DRY_RUN=1
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--dry-run]" >&2
      exit 1
      ;;
  esac
done

echo "======================================================"
echo " LifeOS Post-Launch Verification Audit (LOS-1616)"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

# Section 1: Auditing Post-Launch Specification Document
SPEC_DOC="$REPO_ROOT/life-os/docs/64-POST-LAUNCH-VERIFICATION.md"
echo "[*] Section 1: Auditing Post-Launch Verification Specification ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 64-POST-LAUNCH-VERIFICATION.md specification exists."

  for keyword in "LOS-1616" "Observation Window" "5xx" "Latency" "PostgreSQL" "App Files" "Owner User Journey" "Rollback Triggers" "Follow-ups" "RELEASE OFFICIALLY CLOSED"; do
    if grep -iq "$keyword" "$SPEC_DOC"; then
      echo "  [PASS] Specification contains '$keyword'."
    else
      echo "  [FAIL] Specification missing required keyword: '$keyword'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Specification document missing at $SPEC_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

# Section 2: Auditing Prerequisite Launch Documents
echo "[*] Section 2: Auditing Prerequisite Launch Specifications..."
for doc in \
  "$REPO_ROOT/life-os/docs/63-PRODUCTION-LAUNCH.md" \
  "$REPO_ROOT/life-os/docs/62-PRODUCTION-DOMAIN-AND-LEGAL-PAGES.md" \
  "$REPO_ROOT/life-os/docs/61-RELEASE-AND-ROLLBACK-REHEARSAL.md" \
  "$REPO_ROOT/life-os/docs/60-DEPLOYMENT-AND-ROLLBACK-RUNBOOKS.md" \
  "$REPO_ROOT/life-os/docs/58-MONITORING-AND-ALERTING.md"; do
  if [ -f "$doc" ]; then
    echo "  [PASS] Found reference specification: $(basename "$doc")."
  else
    echo "  [FAIL] Missing reference specification: $doc" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# Section 3: Auditing Backup & Restore Tooling
echo "[*] Section 3: Auditing Backup & Recovery Tooling..."
for bkp_script in \
  "$REPO_ROOT/life-os/scripts/backup-postgres.sh" \
  "$REPO_ROOT/life-os/scripts/backup-app-files.sh" \
  "$REPO_ROOT/life-os/scripts/restore-postgres-backup.sh" \
  "$REPO_ROOT/life-os/scripts/restore-app-files-backup.sh" \
  "$REPO_ROOT/life-os/scripts/validate-postgres-backups.sh" \
  "$REPO_ROOT/life-os/scripts/validate-app-files-backups.sh"; do
  if [ -f "$bkp_script" ] && [ -x "$bkp_script" ]; then
    echo "  [PASS] Verified executable backup script: $(basename "$bkp_script")."
  else
    echo "  [FAIL] Missing or non-executable script: $bkp_script" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# Section 4: Auditing Monitoring & Alerting Rule Assets
echo "[*] Section 4: Auditing Production Monitoring & Alert Rules..."
for rule_file in \
  "$REPO_ROOT/life-os/infra/monitoring/prometheus/rules/uptime.yml" \
  "$REPO_ROOT/life-os/infra/monitoring/prometheus/rules/api.yml" \
  "$REPO_ROOT/life-os/infra/monitoring/prometheus/rules/database.yml" \
  "$REPO_ROOT/life-os/infra/monitoring/prometheus/rules/system.yml" \
  "$REPO_ROOT/life-os/infra/monitoring/prometheus/rules/jobs.yml"; do
  if [ -f "$rule_file" ]; then
    echo "  [PASS] Found alert rule file: $(basename "$rule_file")."
  else
    echo "  [FAIL] Missing alert rule file: $rule_file" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# Section 5: Auditing Safe Logs & Redaction Tools
echo "[*] Section 5: Auditing Safe Logs & Correlation Search Tools..."
for log_tool in \
  "$REPO_ROOT/life-os/scripts/search-logs-by-correlation.sh" \
  "$REPO_ROOT/life-os/scripts/validate-centralized-logs.sh"; do
  if [ -f "$log_tool" ] && [ -x "$log_tool" ]; then
    echo "  [PASS] Verified safe log tool: $(basename "$log_tool")."
  else
    echo "  [FAIL] Missing or non-executable log tool: $log_tool" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# Section 6: Auditing Integration Test Suites
echo "[*] Section 6: Auditing Backend Post-Launch Integration Test Suite..."
TEST_FILE="$REPO_ROOT/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/common/ops/PostLaunchVerificationIntegrationTests.java"
if [ -f "$TEST_FILE" ]; then
  echo "  [PASS] Found integration test suite: $(basename "$TEST_FILE")."
else
  echo "  [FAIL] Missing integration test suite: $TEST_FILE" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "======================================================"
if [ "$ERRORS" -eq 0 ]; then
  echo " [PASS] All 6 Post-Launch Verification Audits Passed Cleanly!"
  echo "======================================================"
  exit 0
else
  echo " [FAIL] Post-Launch Verification Audit Failed with $ERRORS error(s)." >&2
  echo "======================================================"
  exit 1
fi
