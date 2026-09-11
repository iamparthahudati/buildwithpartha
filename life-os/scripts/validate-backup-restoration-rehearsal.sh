#!/usr/bin/env sh

# LifeOS Backup Restoration Rehearsal Audit Script (LOS-1513)
# Audits backup restoration rehearsal specification, execution scripts,
# Spring Boot integration tests, RPO/RTO SLAs, deletion-ledger replay, and safe destruction rules against docs/56-BACKUP-RESTORATION-REHEARSAL.md.

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
echo " LifeOS Backup Restoration Rehearsal Audit (LOS-1513)"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

SPEC_DOC="$REPO_ROOT/life-os/docs/56-BACKUP-RESTORATION-REHEARSAL.md"
REHEARSAL_SCRIPT="$REPO_ROOT/life-os/scripts/run-backup-restoration-rehearsal.sh"
BACKEND_TEST="$REPO_ROOT/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/common/ops/BackupRestorationRehearsalIntegrationTests.java"

# 1. Check Specification Document
echo "[*] Auditing Backup Restoration Rehearsal Specification ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 56-BACKUP-RESTORATION-REHEARSAL.md exists."

  for keyword in "LOS-1513" "RPO" "RTO" "AES-256" "Flyway" "deletion ledger" "Safe Teardown" "Quarterly Schedule"; do
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
  echo "  [PASS] run-backup-restoration-rehearsal.sh exists."

  if [ -x "$REHEARSAL_SCRIPT" ]; then
    echo "  [PASS] run-backup-restoration-rehearsal.sh is executable."
  else
    echo "  [FAIL] run-backup-restoration-rehearsal.sh is not executable." >&2
    ERRORS=$((ERRORS + 1))
  fi

  for pattern in "--dry-run" "--rto-target" "--rpo-target" "Flyway" "deletion ledger" "teardown"; do
    if grep -q -- "$pattern" "$REHEARSAL_SCRIPT"; then
      echo "  [PASS] run-backup-restoration-rehearsal.sh contains pattern '$pattern'."
    else
      echo "  [FAIL] run-backup-restoration-rehearsal.sh missing required pattern '$pattern'." >&2
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
  echo "  [PASS] BackupRestorationRehearsalIntegrationTests.java exists."

  for test_method in "testFullBackupRestorationRehearsalWithSampledDataIntegrity" "testFlywayMigrationsAppliedAndValidatedOnRestoredDatabase" "testRtoAndRpoTimingBudgetCompliance" "testPostRestorationDeletionLedgerReplay" "testRestorationDecryptionIntegrityAndSecretExclusion" "testSecureTeardownAndRestoredCopyDestruction"; do
    if grep -q "$test_method" "$BACKEND_TEST"; then
      echo "  [PASS] Backend suite implements '$test_method'."
    else
      echo "  [FAIL] Backend suite missing method '$test_method'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] BackupRestorationRehearsalIntegrationTests.java missing at $BACKEND_TEST" >&2
  ERRORS=$((ERRORS + 1))
fi

# 4. Dry-run execution of Rehearsal Script
echo "[*] Executing Rehearsal Runner in Dry-Run Mode..."
if sh "$REHEARSAL_SCRIPT" --dry-run >/dev/null 2>&1; then
  echo "  [PASS] run-backup-restoration-rehearsal.sh executes successfully in dry-run mode."
else
  echo "  [FAIL] run-backup-restoration-rehearsal.sh failed during dry-run execution." >&2
  ERRORS=$((ERRORS + 1))
fi

echo "======================================================"
if [ "$ERRORS" -eq 0 ]; then
  echo " [SUCCESS] Backup restoration rehearsal audit PASSED cleanly with 0 errors."
  echo "======================================================"
  exit 0
else
  echo " [FAILED] Backup restoration rehearsal audit FAILED with $ERRORS error(s)." >&2
  echo "======================================================"
  exit 1
fi
