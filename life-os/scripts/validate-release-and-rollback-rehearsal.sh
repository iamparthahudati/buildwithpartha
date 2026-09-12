#!/usr/bin/env sh

# ==============================================================================
# LifeOS Release and Rollback Rehearsal Audit Script (LOS-1613)
# ==============================================================================
# Audits release and rollback rehearsal specification, runner script,
# Spring Boot integration tests, backward-compatible DB strategy,
# timing SLAs, and gap remediation tracking against docs/61-RELEASE-AND-ROLLBACK-REHEARSAL.md.
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
echo " LifeOS Release & Rollback Rehearsal Audit (LOS-1613)"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

SPEC_DOC="$REPO_ROOT/life-os/docs/61-RELEASE-AND-ROLLBACK-REHEARSAL.md"
REHEARSAL_SCRIPT="$REPO_ROOT/life-os/scripts/run-release-and-rollback-rehearsal.sh"
BACKEND_TEST="$REPO_ROOT/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/common/ops/ReleaseAndRollbackRehearsalIntegrationTests.java"

# 1. Check Specification Document
echo "[*] Auditing Release & Rollback Rehearsal Specification ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 61-RELEASE-AND-ROLLBACK-REHEARSAL.md exists."

  for keyword in "LOS-1613" "Expand-Contract" "RTO" "Flyway" "Rollback" "staging" "Gaps" "GAP-01"; do
    if grep -q "$keyword" "$SPEC_DOC"; then
      echo "  [PASS] Specification contains '$keyword'."
    else
      echo "  [FAIL] Specification missing required section or keyword: '$keyword'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Specification document missing at $SPEC_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

# 2. Check Rehearsal Runner Script
echo "[*] Auditing Rehearsal Runner Script ($REHEARSAL_SCRIPT)..."
if [ -f "$REHEARSAL_SCRIPT" ]; then
  echo "  [PASS] run-release-and-rollback-rehearsal.sh exists."

  if [ -x "$REHEARSAL_SCRIPT" ]; then
    echo "  [PASS] run-release-and-rollback-rehearsal.sh is executable."
  else
    echo "  [FAIL] run-release-and-rollback-rehearsal.sh is not executable." >&2
    ERRORS=$((ERRORS + 1))
  fi

  for pattern in "--dry-run" "--target" "--tag" "--rollback-tag" "Expand-Contract" "rollback-release.sh" "deploy-pipeline.sh"; do
    if grep -q -- "$pattern" "$REHEARSAL_SCRIPT"; then
      echo "  [PASS] run-release-and-rollback-rehearsal.sh contains pattern '$pattern'."
    else
      echo "  [FAIL] run-release-and-rollback-rehearsal.sh missing required pattern '$pattern'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Rehearsal runner script missing at $REHEARSAL_SCRIPT" >&2
  ERRORS=$((ERRORS + 1))
fi

# 3. Check Backend Rehearsal Integration Tests
echo "[*] Auditing Backend Rehearsal Integration Tests ($BACKEND_TEST)..."
if [ -f "$BACKEND_TEST" ]; then
  echo "  [PASS] ReleaseAndRollbackRehearsalIntegrationTests.java exists."

  for test_method in "testForwardReleaseDeploymentAndActuatorHealthVerification" "testBackwardCompatibleDatabaseSchemaEvolutionStrategy" "testApplicationRollbackToPreviousReleaseTag" "testFailedMigrationDetectionAndRepairProcedure" "testReleaseAndRollbackTimingSlaCompliance" "testDeploymentAndRollbackAuditLedgerIntegrity"; do
    if grep -q "$test_method" "$BACKEND_TEST"; then
      echo "  [PASS] Backend suite implements '$test_method'."
    else
      echo "  [FAIL] Backend suite missing method '$test_method'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] ReleaseAndRollbackRehearsalIntegrationTests.java missing at $BACKEND_TEST" >&2
  ERRORS=$((ERRORS + 1))
fi

# 4. Dry-run execution of Rehearsal Script
echo "[*] Executing Rehearsal Runner in Dry-Run Mode..."
if [ -x "$REHEARSAL_SCRIPT" ]; then
  OUTPUT=$(sh "$REHEARSAL_SCRIPT" --dry-run --target=staging 2>&1)
  if echo "$OUTPUT" | grep -q "APPROVED FOR PRODUCTION LAUNCH"; then
    echo "  [PASS] Dry-run rehearsal completed with launch approval."
  else
    echo "  [FAIL] Dry-run rehearsal failed to produce launch approval." >&2
    echo "$OUTPUT" >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] Cannot execute rehearsal script (missing or not executable)." >&2
  ERRORS=$((ERRORS + 1))
fi

echo "======================================================"
if [ "$ERRORS" -eq 0 ]; then
  echo " [PASS] All 4 Release & Rollback Rehearsal Audits Passed!"
  echo "======================================================"
  exit 0
else
  echo " [FAIL] Release & Rollback Rehearsal Audit Failed with $ERRORS error(s)." >&2
  echo "======================================================"
  exit 1
fi
