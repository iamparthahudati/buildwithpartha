#!/usr/bin/env sh

# LifeOS Launch QA Report Audit Script (LOS-1514)
# Audits the consolidated launch QA report, quality domains, defect register,
# accepted risk registry, acceptance matrix items (QA-REP-001..QA-REP-008),
# and explicit go/no-go verdict against docs/57-LAUNCH-QA-REPORT.md.

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
echo " LifeOS Launch QA Report Audit (LOS-1514)"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

SPEC_DOC="$REPO_ROOT/life-os/docs/57-LAUNCH-QA-REPORT.md"
ACCEPTANCE_DOC="$REPO_ROOT/life-os/docs/18-QA-ACCEPTANCE-MATRIX.md"
STRATEGY_DOC="$REPO_ROOT/life-os/docs/13-QA-TEST-STRATEGY.md"

# 1. Check Launch QA Report Document
echo "[*] Auditing Consolidated Launch QA Report ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 57-LAUNCH-QA-REPORT.md exists."

  for keyword in \
    "LOS-1514" \
    "LAUNCH VERDICT: GO" \
    "Critical User Journeys" \
    "Cross-User Authorization" \
    "Frontend Accessibility" \
    "Browser Compatibility Matrix" \
    "Timezone & Recurrence" \
    "STRIDE Threat Model" \
    "Security Headers & Content Security Policy" \
    "Dependency, Secret & Container Scans" \
    "Dynamic Application Security Testing" \
    "Performance Budgets" \
    "Failure and Recovery UX" \
    "Data Privacy, Export Portability & Deletion Lifecycle" \
    "Disaster Recovery & Backup Restoration Rehearsal" \
    "Defect Ledger" \
    "Formal Accepted Risks Registry" \
    "Launch Sign-Off Matrix"; do
    if grep -q "$keyword" "$SPEC_DOC"; then
      echo "  [PASS] Specification contains '$keyword'."
    else
      echo "  [FAIL] Specification missing required section or keyword: '$keyword'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Launch QA report missing at $SPEC_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

# 2. Check Acceptance Matrix Integration
echo "[*] Auditing QA Acceptance Matrix for QA-REP criteria ($ACCEPTANCE_DOC)..."
if [ -f "$ACCEPTANCE_DOC" ]; then
  echo "  [PASS] 18-QA-ACCEPTANCE-MATRIX.md exists."

  for rep_id in "QA-REP-001" "QA-REP-002" "QA-REP-003" "QA-REP-004" "QA-REP-005" "QA-REP-006" "QA-REP-007" "QA-REP-008"; do
    if grep -q "$rep_id" "$ACCEPTANCE_DOC"; then
      echo "  [PASS] Acceptance matrix contains '$rep_id'."
    else
      echo "  [FAIL] Acceptance matrix missing criterion '$rep_id'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Acceptance matrix document missing at $ACCEPTANCE_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

# 3. Check QA Strategy Reference
echo "[*] Auditing QA Strategy Document Reference ($STRATEGY_DOC)..."
if [ -f "$STRATEGY_DOC" ]; then
  echo "  [PASS] 13-QA-TEST-STRATEGY.md exists."

  if grep -q "57-LAUNCH-QA-REPORT.md" "$STRATEGY_DOC"; then
    echo "  [PASS] 13-QA-TEST-STRATEGY.md links to 57-LAUNCH-QA-REPORT.md."
  else
    echo "  [FAIL] 13-QA-TEST-STRATEGY.md does not reference 57-LAUNCH-QA-REPORT.md." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] QA strategy document missing at $STRATEGY_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

# 4. Verify Related Sub-System Audit Scripts Exist and are Executable
echo "[*] Auditing Sub-System Verification Scripts..."
for script_name in \
  "validate-security-headers.sh" \
  "validate-security-scans.sh" \
  "validate-application-security.sh" \
  "validate-performance-budgets.sh" \
  "validate-failure-and-recovery-ux.sh" \
  "validate-data-privacy.sh" \
  "validate-backup-restoration-rehearsal.sh"; do
  target_script="$REPO_ROOT/life-os/scripts/$script_name"
  if [ -x "$target_script" ]; then
    echo "  [PASS] $script_name is present and executable."
  else
    echo "  [FAIL] $script_name missing or not executable at $target_script" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

echo "======================================================"
if [ "$ERRORS" -eq 0 ]; then
  echo " [SUCCESS] Launch QA report audit PASSED cleanly with 0 errors."
  echo "======================================================"
  exit 0
else
  echo " [FAILED] Launch QA report audit FAILED with $ERRORS error(s)." >&2
  echo "======================================================"
  exit 1
fi
