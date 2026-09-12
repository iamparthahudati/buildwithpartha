#!/usr/bin/env sh

# ==============================================================================
# LifeOS Production Launch Validation Script (LOS-1615)
# ==============================================================================
# Audits production launch specification, execution scripts, prerequisite phase gates,
# production Compose/Caddy configs, monitoring rules, and integration test coverage.
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
echo " LifeOS Production Launch Audit (LOS-1615)"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

# Section 1: Auditing Production Launch Specification
SPEC_DOC="$REPO_ROOT/life-os/docs/63-PRODUCTION-LAUNCH.md"
echo "[*] Section 1: Auditing Production Launch Specification ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 63-PRODUCTION-LAUNCH.md specification exists."

  for keyword in "LOS-1615" "buildwithpartha.tech/life-os" "v1.0.0" "Flyway" "Actuator" "deployments.json" "LOS-1616"; do
    if grep -q "$keyword" "$SPEC_DOC"; then
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

# Section 2: Auditing Prerequisite Phase Gates
echo "[*] Section 2: Auditing Prerequisite Phase Gates & Rehearsals..."
for gate_doc in \
  "$REPO_ROOT/life-os/docs/gates/QUALITY-SECURITY-PHASE-GATE.md" \
  "$REPO_ROOT/life-os/docs/61-RELEASE-AND-ROLLBACK-REHEARSAL.md" \
  "$REPO_ROOT/life-os/docs/62-PRODUCTION-DOMAIN-AND-LEGAL-PAGES.md"; do
  if [ -f "$gate_doc" ]; then
    echo "  [PASS] Prerequisite document exists: $(basename "$gate_doc")."
  else
    echo "  [FAIL] Missing prerequisite document: $gate_doc" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# Section 3: Auditing Launch & Rollback Scripts
echo "[*] Section 3: Auditing Launch, Pipeline, and Rollback Scripts..."
for script_file in \
  "$REPO_ROOT/life-os/scripts/execute-production-launch.sh" \
  "$REPO_ROOT/life-os/scripts/deploy-pipeline.sh" \
  "$REPO_ROOT/life-os/scripts/rollback-release.sh" \
  "$REPO_ROOT/life-os/scripts/run-release-and-rollback-rehearsal.sh"; do
  if [ -f "$script_file" ]; then
    echo "  [PASS] Found script $(basename "$script_file")."
  else
    echo "  [FAIL] Missing script: $script_file" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# Section 4: Auditing Production Compose & Caddy Ingress
echo "[*] Section 4: Auditing Production Compose & Caddy Configuration..."
for conf in \
  "$REPO_ROOT/life-os/infra/compose/compose.prod.yml" \
  "$REPO_ROOT/life-os/infra/caddy/Caddyfile.prod" \
  "$REPO_ROOT/life-os/apps/web/public/robots.txt" \
  "$REPO_ROOT/life-os/apps/web/public/.well-known/security.txt"; do
  if [ -f "$conf" ]; then
    echo "  [PASS] Found configuration / asset: $(basename "$conf")."
  else
    echo "  [FAIL] Missing configuration: $conf" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# Section 5: Auditing Monitoring & Alert Rules
echo "[*] Section 5: Auditing Production Monitoring & Alert Rules..."
for mon_file in \
  "$REPO_ROOT/life-os/infra/monitoring/prometheus/prometheus.yml" \
  "$REPO_ROOT/life-os/infra/monitoring/alertmanager/alertmanager.yml" \
  "$REPO_ROOT/life-os/infra/monitoring/blackbox/blackbox.yml" \
  "$REPO_ROOT/life-os/infra/compose/compose.monitoring.yml"; do
  if [ -f "$mon_file" ]; then
    echo "  [PASS] Found monitoring config: $(basename "$mon_file")."
  else
    echo "  [FAIL] Missing monitoring config: $mon_file" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# Section 6: Auditing Integration Test Suite
echo "[*] Section 6: Auditing Backend Production Launch Integration Test Suite..."
TEST_FILE="$REPO_ROOT/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/common/ops/ProductionLaunchIntegrationTests.java"
if [ -f "$TEST_FILE" ]; then
  echo "  [PASS] Found integration test suite: $(basename "$TEST_FILE")."
else
  echo "  [FAIL] Missing integration test suite: $TEST_FILE" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "======================================================"
if [ "$ERRORS" -eq 0 ]; then
  echo " [PASS] All 6 Production Launch Audits Passed Cleanly!"
  echo "======================================================"
  exit 0
else
  echo " [FAIL] Production Launch Audit Failed with $ERRORS error(s)." >&2
  echo "======================================================"
  exit 1
fi
