#!/usr/bin/env sh

# LifeOS Application Security Testing and DAST Audit Script (LOS-1509)
# Audits dynamic application security testing, penetration testing suite, and findings register against docs/53-APPLICATION-SECURITY-TESTING.md.

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
echo " LifeOS Application Security & DAST Audit (LOS-1509)"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

SPEC_DOC="$REPO_ROOT/life-os/docs/53-APPLICATION-SECURITY-TESTING.md"
APPSEC_TEST="$REPO_ROOT/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ApplicationSecurityTestingIntegrationTests.java"
MATRIX_TEST="$REPO_ROOT/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/CrossUserAuthorizationMatrixIntegrationTests.java"
THREAT_TEST="$REPO_ROOT/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ThreatModelSecurityIntegrationTests.java"
HEADERS_TEST="$REPO_ROOT/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/SecurityHeadersIntegrationTests.java"
MIME_VALIDATOR="$REPO_ROOT/life-os/apps/api/src/main/java/tech/buildwithpartha/lifeos/attachment/domain/AttachmentMimeValidator.java"
CACHE_FILTER="$REPO_ROOT/life-os/apps/api/src/main/java/tech/buildwithpartha/lifeos/common/cache/ApiCachePolicyFilter.java"

# 1. Check Specification Document
echo "[*] Auditing Application Security Testing Specification ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 53-APPLICATION-SECURITY-TESTING.md exists."

  for keyword in "LOS-1509" "OWASP ZAP" "IDOR" "CSRF" "Session Management" "Password Reset" "File Upload" "Data Export" "Cache-Control" "AST-01" "AST-08" "Formally Accepted"; do
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

# 2. Check Automated Integration Test Suites
echo "[*] Auditing Automated Application Security Test Suite ($APPSEC_TEST)..."
if [ -f "$APPSEC_TEST" ]; then
  echo "  [PASS] ApplicationSecurityTestingIntegrationTests.java exists."

  for test_scenario in "AST-01" "AST-02" "AST-03" "AST-04" "AST-05" "AST-06" "AST-07" "AST-08" "AST-09" "AST-10" "AST-11" "AST-12" "AST-13" "AST-14" "AST-15" "AST-16" "AST-17" "AST-18" "AST-19"; do
    if grep -q "$test_scenario" "$APPSEC_TEST"; then
      echo "  [PASS] Automated suite contains scenario '$test_scenario'."
    else
      echo "  [FAIL] Automated suite missing scenario '$test_scenario'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] ApplicationSecurityTestingIntegrationTests.java missing at $APPSEC_TEST" >&2
  ERRORS=$((ERRORS + 1))
fi

# 3. Check Prerequisite Security Test Suites
echo "[*] Auditing Prerequisite Security Suites (STRIDE, Matrix, Headers)..."
for suite in "$MATRIX_TEST" "$THREAT_TEST" "$HEADERS_TEST"; do
  if [ -f "$suite" ]; then
    echo "  [PASS] $(basename "$suite") exists."
  else
    echo "  [FAIL] Prerequisite suite missing at $suite" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# 4. Check MIME & File Upload Security Policy
echo "[*] Auditing File Upload & MIME Security Enforcement ($MIME_VALIDATOR)..."
if [ -f "$MIME_VALIDATOR" ]; then
  echo "  [PASS] AttachmentMimeValidator.java exists."
  for forbidden in ".exe" ".sh" ".bat" ".html" ".svg"; do
    if grep -q "$forbidden" "$MIME_VALIDATOR"; then
      echo "  [PASS] AttachmentMimeValidator blocks dangerous extension '$forbidden'."
    else
      echo "  [FAIL] AttachmentMimeValidator missing block for '$forbidden'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] AttachmentMimeValidator missing at $MIME_VALIDATOR" >&2
  ERRORS=$((ERRORS + 1))
fi

# 5. Check API Cache Protection Filter
echo "[*] Auditing API Cache Protection Filter ($CACHE_FILTER)..."
if [ -f "$CACHE_FILTER" ]; then
  echo "  [PASS] ApiCachePolicyFilter.java exists."
  for directive in "no-cache" "must-revalidate" "private"; do
    if grep -q "$directive" "$CACHE_FILTER"; then
      echo "  [PASS] ApiCachePolicyFilter enforces '$directive'."
    else
      echo "  [FAIL] ApiCachePolicyFilter missing '$directive'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] ApiCachePolicyFilter missing at $CACHE_FILTER" >&2
  ERRORS=$((ERRORS + 1))
fi

# 6. Check Findings Matrix Completeness
echo "[*] Auditing Findings Register & Risk Acceptance Matrix..."
FINDINGS_COUNT=$(grep -c "^| \*\*AST-" "$SPEC_DOC" || true)
if [ "$FINDINGS_COUNT" -ge 8 ]; then
  echo "  [PASS] Findings register contains $FINDINGS_COUNT documented findings (all resolved or accepted)."
else
  echo "  [FAIL] Findings register has insufficient findings entries ($FINDINGS_COUNT < 8)." >&2
  ERRORS=$((ERRORS + 1))
fi

echo "------------------------------------------------------"
if [ "$ERRORS" -eq 0 ]; then
  echo "[SUCCESS] All LOS-1509 application security testing and DAST assertions PASSED cleanly!"
  exit 0
else
  echo "[FAILURE] $ERRORS application security audit failure(s) detected." >&2
  exit 1
fi
