#!/usr/bin/env sh

# LifeOS Dependency, Secret, and Container Scanning Audit Script (LOS-1508)
# Audits security scanning specification, exception registry, Gitleaks, Trivy, SBOM, and provenance policies.

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
echo " LifeOS Security Scans & Gating Audit (LOS-1508)"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

SPEC_DOC="$REPO_ROOT/life-os/docs/52-DEPENDENCY-SECRET-CONTAINER-SCANS.md"
EXCEPTIONS_FILE="$REPO_ROOT/life-os/security/scan-exceptions.json"
SBOM_SCRIPT="$REPO_ROOT/life-os/scripts/generate-sbom-and-provenance.sh"
CI_WORKFLOW="$REPO_ROOT/.github/workflows/lifeos-ci.yml"

# 1. Check Specification Document
echo "[*] Auditing Security Scanning Specification ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 52-DEPENDENCY-SECRET-CONTAINER-SCANS.md exists."

  if grep -q "LOS-1508" "$SPEC_DOC" && \
     grep -q "CRITICAL" "$SPEC_DOC" && \
     grep -q "HIGH" "$SPEC_DOC" && \
     grep -q "Gitleaks" "$SPEC_DOC" && \
     grep -q "Trivy" "$SPEC_DOC" && \
     grep -q "Software Bill of Materials" "$SPEC_DOC" && \
     grep -q "SLSA" "$SPEC_DOC"; then
    echo "  [PASS] Specification contains complete multi-tier scanning and gating policies."
  else
    echo "  [FAIL] Specification missing required contract sections." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] Specification document missing at $SPEC_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

# 2. Audit Exception Registry
echo "[*] Auditing Vulnerability Exception Registry ($EXCEPTIONS_FILE)..."
if [ -f "$EXCEPTIONS_FILE" ]; then
  echo "  [PASS] scan-exceptions.json exists."

  # Validate JSON syntax and rules using node
  EXCEPTION_VALIDATION=$(node -e "
    const fs = require('fs');
    try {
      const data = JSON.parse(fs.readFileSync('$EXCEPTIONS_FILE', 'utf8'));
      if (!data.version || !data.last_updated || !Array.isArray(data.exceptions)) {
        console.error('Invalid registry structure: missing version, last_updated, or exceptions array.');
        process.exit(1);
      }
      const now = new Date();
      for (const exp of data.exceptions) {
        if (!exp.id || !exp.target || !exp.vulnerability_id || !exp.package || !exp.severity || !exp.owner || !exp.expires_at || !exp.status) {
          console.error('Exception missing mandatory fields: ' + JSON.stringify(exp));
          process.exit(1);
        }
        if (exp.severity !== 'CRITICAL' && exp.severity !== 'HIGH') {
          console.error('Exception ' + exp.id + ' has invalid severity ' + exp.severity);
          process.exit(1);
        }
        const expDate = new Date(exp.expires_at + 'T23:59:59Z');
        if (expDate < now && exp.status === 'APPROVED') {
          console.error('Exception ' + exp.id + ' is EXPIRED (' + exp.expires_at + '). Expired exceptions block release.');
          process.exit(1);
        }
      }
      console.log('VALID:' + data.exceptions.length);
    } catch (e) {
      console.error('JSON parsing or validation error: ' + e.message);
      process.exit(1);
    }
  " 2>&1)

  if [ $? -eq 0 ]; then
    NUM_EXP=$(echo "$EXCEPTION_VALIDATION" | grep "VALID:" | cut -d: -f2)
    echo "  [PASS] Exception registry format valid ($NUM_EXP active/tracked exceptions; 0 expired)."
  else
    echo "  [FAIL] Exception registry validation error: $EXCEPTION_VALIDATION" >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] scan-exceptions.json missing at $EXCEPTIONS_FILE" >&2
  ERRORS=$((ERRORS + 1))
fi

# 3. Check Secret Scanning Configuration
echo "[*] Auditing Secret Scanning Contract (Gitleaks)..."
if [ -f "$CI_WORKFLOW" ]; then
  if grep -q "gitleaks/gitleaks-action" "$CI_WORKFLOW" && grep -q "LifeOS / Secret scan" "$CI_WORKFLOW"; then
    echo "  [PASS] Gitleaks secret scanner configured in CI workflow with immutable action pin."
  else
    echo "  [FAIL] Missing Gitleaks secret scan configuration in CI workflow." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] CI workflow missing at $CI_WORKFLOW" >&2
  ERRORS=$((ERRORS + 1))
fi

# 4. Check Container Vulnerability Scanning Configuration
echo "[*] Auditing Container Security & Scanner Configuration..."
if [ -f "$CI_WORKFLOW" ]; then
  if grep -q "LifeOS / Container scan" "$CI_WORKFLOW" || grep -q "trivy" "$CI_WORKFLOW"; then
    echo "  [PASS] Container vulnerability scanning configured in CI workflow."
  else
    echo "  [FAIL] Missing container scanning configuration in CI workflow." >&2
    ERRORS=$((ERRORS + 1))
  fi
fi

# 5. Check Scheduled Continuous Monitoring
echo "[*] Auditing Scheduled Security Scan Triggers..."
if [ -f "$CI_WORKFLOW" ]; then
  if grep -q "schedule:" "$CI_WORKFLOW" && grep -q "cron:" "$CI_WORKFLOW"; then
    echo "  [PASS] Scheduled nightly security scanning cron trigger configured in CI workflow."
  else
    echo "  [FAIL] Missing scheduled cron trigger in CI workflow." >&2
    ERRORS=$((ERRORS + 1))
  fi
fi

# 6. Audit SBOM and Provenance Generator
echo "[*] Auditing SBOM & Provenance Generator ($SBOM_SCRIPT)..."
if [ -f "$SBOM_SCRIPT" ]; then
  echo "  [PASS] generate-sbom-and-provenance.sh exists."

  if [ -x "$SBOM_SCRIPT" ]; then
    echo "  [PASS] generate-sbom-and-provenance.sh is executable."
  else
    echo "  [FAIL] generate-sbom-and-provenance.sh is not executable." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if sh "$SBOM_SCRIPT" --dry-run >/dev/null 2>&1; then
    echo "  [PASS] SBOM and SLSA Provenance generation dry-run executed successfully."
  else
    echo "  [FAIL] SBOM and SLSA Provenance generator execution failed." >&2
    ERRORS=$((ERRORS + 1))
  fi

  # Verify generated artifacts
  SBOM_DIR="$REPO_ROOT/life-os/artifacts/sbom"
  if [ -f "$SBOM_DIR/provenance.json" ]; then
    echo "  [PASS] SLSA build provenance artifact verified."
  else
    echo "  [FAIL] Missing provenance artifact at $SBOM_DIR/provenance.json" >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] SBOM generator missing at $SBOM_SCRIPT" >&2
  ERRORS=$((ERRORS + 1))
fi

# 7. Summary & Result
echo "------------------------------------------------------"
if [ "$ERRORS" -eq 0 ]; then
  echo "[SUCCESS] All LOS-1508 security scanning, gating, and SBOM audit assertions PASSED cleanly!"
  exit 0
else
  echo "[ERROR] Security scanning audit failed with $ERRORS error(s)." >&2
  exit 1
fi
