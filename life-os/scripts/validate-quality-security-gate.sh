#!/usr/bin/env sh

# LifeOS Quality, Accessibility, Security, and Resilience Phase Gate Audit Script (LOS-1515)
# Audits the final quality/security phase gate specification, release gate criteria,
# acceptance matrix items (QA-GATE-001..QA-GATE-008), sub-system verification scripts,
# and owner sign-off against docs/gates/QUALITY-SECURITY-PHASE-GATE.md.

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
echo " LifeOS Quality & Security Phase Gate Audit (LOS-1515)"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

GATE_DOC="$REPO_ROOT/life-os/docs/gates/QUALITY-SECURITY-PHASE-GATE.md"
ACCEPTANCE_DOC="$REPO_ROOT/life-os/docs/18-QA-ACCEPTANCE-MATRIX.md"
STRATEGY_DOC="$REPO_ROOT/life-os/docs/13-QA-TEST-STRATEGY.md"

# 1. Check Quality/Security Phase Gate Document
echo "[*] Auditing Quality & Security Phase Gate Document ($GATE_DOC)..."
if [ -f "$GATE_DOC" ]; then
  echo "  [PASS] QUALITY-SECURITY-PHASE-GATE.md exists."

  for keyword in \
    "LOS-1515" \
    "Status: PASSED" \
    "Owner approval evidence" \
    "UNANIMOUS GO" \
    "Critical Playwright E2E User Journeys" \
    "Cross-User Authorization Matrix" \
    "Frontend Accessibility & WCAG 2.2 AA" \
    "Responsive & Browser Compatibility Matrix" \
    "Timezone & Recurrence Boundary Matrix" \
    "STRIDE Threat Model & Security Posture" \
    "Defense-in-Depth HTTP Security Headers" \
    "Dependency, Secret & Container Scans" \
    "Dynamic Application Security Testing" \
    "Performance Budgets & Scalability" \
    "Failure & Recovery UX" \
    "Data Privacy, Export Portability & Deletion Lifecycle" \
    "Disaster Recovery & Backup Restoration Rehearsal" \
    "Defect ledger & severity triage" \
    "Formal accepted risks registry" \
    "Database migrations & rollback integrity" \
    "Phase gate sign-off & release verdict"; do
    if grep -q "$keyword" "$GATE_DOC"; then
      echo "  [PASS] Gate document contains '$keyword'."
    else
      echo "  [FAIL] Gate document missing required section or keyword: '$keyword'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Quality & Security Phase Gate document missing at $GATE_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

# 2. Check Acceptance Matrix Integration
echo "[*] Auditing QA Acceptance Matrix for QA-GATE criteria ($ACCEPTANCE_DOC)..."
if [ -f "$ACCEPTANCE_DOC" ]; then
  echo "  [PASS] 18-QA-ACCEPTANCE-MATRIX.md exists."

  for gate_id in "QA-GATE-001" "QA-GATE-002" "QA-GATE-003" "QA-GATE-004" "QA-GATE-005" "QA-GATE-006" "QA-GATE-007" "QA-GATE-008"; do
    if grep -q "$gate_id" "$ACCEPTANCE_DOC"; then
      echo "  [PASS] Acceptance matrix contains '$gate_id'."
    else
      echo "  [FAIL] Acceptance matrix missing criterion '$gate_id'." >&2
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

  if grep -q "QUALITY-SECURITY-PHASE-GATE.md" "$STRATEGY_DOC"; then
    echo "  [PASS] 13-QA-TEST-STRATEGY.md links to QUALITY-SECURITY-PHASE-GATE.md."
  else
    echo "  [FAIL] 13-QA-TEST-STRATEGY.md does not reference QUALITY-SECURITY-PHASE-GATE.md." >&2
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
  "validate-backup-restoration-rehearsal.sh" \
  "validate-launch-qa-report.sh"; do
  target_script="$REPO_ROOT/life-os/scripts/$script_name"
  if [ -x "$target_script" ]; then
    echo "  [PASS] $script_name is present and executable."
  else
    echo "  [FAIL] $script_name missing or not executable at $target_script" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# 5. Live Execution of Core Sub-System Scripts (if not in dry-run mode)
if [ "$DRY_RUN" -eq 0 ] && [ "$ERRORS" -eq 0 ]; then
  echo "[*] Executing sub-system validations..."
  sh "$REPO_ROOT/life-os/scripts/validate-security-headers.sh" || ERRORS=$((ERRORS + 1))
  sh "$REPO_ROOT/life-os/scripts/validate-security-scans.sh" --dry-run || ERRORS=$((ERRORS + 1))
  sh "$REPO_ROOT/life-os/scripts/validate-application-security.sh" --dry-run || ERRORS=$((ERRORS + 1))
  sh "$REPO_ROOT/life-os/scripts/validate-performance-budgets.sh" --dry-run || ERRORS=$((ERRORS + 1))
  sh "$REPO_ROOT/life-os/scripts/validate-failure-and-recovery-ux.sh" --dry-run || ERRORS=$((ERRORS + 1))
  sh "$REPO_ROOT/life-os/scripts/validate-data-privacy.sh" --dry-run || ERRORS=$((ERRORS + 1))
  sh "$REPO_ROOT/life-os/scripts/validate-backup-restoration-rehearsal.sh" --dry-run || ERRORS=$((ERRORS + 1))
  sh "$REPO_ROOT/life-os/scripts/validate-launch-qa-report.sh" --dry-run || ERRORS=$((ERRORS + 1))
fi

echo "======================================================"
if [ "$ERRORS" -eq 0 ]; then
  echo " [SUCCESS] Quality & Security phase gate audit PASSED cleanly with 0 errors."
  echo "======================================================"
  exit 0
else
  echo " [FAILED] Quality & Security phase gate audit FAILED with $ERRORS error(s)." >&2
  echo "======================================================"
  exit 1
fi
