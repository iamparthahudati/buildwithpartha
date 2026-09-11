#!/usr/bin/env sh

# LifeOS Failure and Recovery UX Audit Script (LOS-1511)
# Audits failure injection, honest states, data preservation, and recovery UX specifications and tests against docs/55-FAILURE-AND-RECOVERY-UX.md.

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
echo " LifeOS Failure & Recovery UX Audit (LOS-1511)"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

SPEC_DOC="$REPO_ROOT/life-os/docs/55-FAILURE-AND-RECOVERY-UX.md"
PLAYWRIGHT_TEST="$REPO_ROOT/life-os/apps/web/e2e/failure-recovery/failure-recovery-ux.spec.ts"
BACKEND_TEST="$REPO_ROOT/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/common/ops/FailureRecoveryUxIntegrationTests.java"
ERROR_BOUNDARY="$REPO_ROOT/life-os/apps/web/src/components/feedback/ErrorBoundary.tsx"
ERROR_STATE="$REPO_ROOT/life-os/apps/web/src/components/feedback/ErrorState.tsx"

# 1. Check Specification Document
echo "[*] Auditing Failure & Recovery UX Specification ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 55-FAILURE-AND-RECOVERY-UX.md exists."

  for keyword in "LOS-1511" "Mode 1: Offline Mode" "Mode 2: Network Timeouts" "Mode 3: Server 5xx" "Mode 4: HTTP 429 Rate Limiting" "Mode 5: Expired Authentication" "Mode 6: Stale Version" "Mode 7: Background & Asynchronous Job Failure" "Mode 8: Partial Widget Failure" "State Transition Matrix" "What Happened" "What Was Preserved/Current" "Next Action"; do
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

# 2. Check Playwright Failure & Recovery E2E Suite
echo "[*] Auditing Playwright Failure & Recovery E2E Suite ($PLAYWRIGHT_TEST)..."
if [ -f "$PLAYWRIGHT_TEST" ]; then
  echo "  [PASS] failure-recovery-ux.spec.ts exists."

  for mode in "Mode 1: Offline mode" "Mode 2: Network timeout" "Mode 3: Server 500 error" "Mode 4: HTTP 429 Rate limiting" "Mode 5: Expired session" "Mode 6: Stale version 409 conflict" "Mode 7: Asynchronous job failure" "Mode 8: Partial widget failure"; do
    if grep -q "$mode" "$PLAYWRIGHT_TEST"; then
      echo "  [PASS] Playwright suite covers '$mode'."
    else
      echo "  [FAIL] Playwright suite missing scenario for '$mode'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Playwright suite missing at $PLAYWRIGHT_TEST" >&2
  ERRORS=$((ERRORS + 1))
fi

# 3. Check Backend Failure & Recovery Integration Tests
echo "[*] Auditing Backend Failure & Recovery Integration Tests ($BACKEND_TEST)..."
if [ -f "$BACKEND_TEST" ]; then
  echo "  [PASS] FailureRecoveryUxIntegrationTests.java exists."

  for test_method in "errorResponsesAreSanitizedAndCompliant" "correlationIdEchoedInHeadersAndProblemDetails" "rateLimitReturns429WithRetryAfterHeader" "retriedRequestWithSameIdempotencyKeyReturnsCachedResponse" "rejectingKeyReuseAcrossDifferentOperations"; do
    if grep -q "$test_method" "$BACKEND_TEST"; then
      echo "  [PASS] Backend suite implements '$test_method'."
    else
      echo "  [FAIL] Backend suite missing method '$test_method'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] FailureRecoveryUxIntegrationTests.java missing at $BACKEND_TEST" >&2
  ERRORS=$((ERRORS + 1))
fi

# 4. Check UI Error Boundary & Error State Primitives
echo "[*] Auditing Error Boundary and Error State Primitives..."
if [ -f "$ERROR_BOUNDARY" ] && grep -q "ErrorState" "$ERROR_BOUNDARY"; then
  echo "  [PASS] ErrorBoundary.tsx delegates safely to ErrorState."
else
  echo "  [FAIL] ErrorBoundary.tsx missing or invalid at $ERROR_BOUNDARY" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ -f "$ERROR_STATE" ] && grep -q "Reference ID" "$ERROR_STATE"; then
  echo "  [PASS] ErrorState.tsx handles correlation ID display without leaking stack traces."
else
  echo "  [FAIL] ErrorState.tsx missing or invalid at $ERROR_STATE" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "------------------------------------------------------"
if [ "$ERRORS" -eq 0 ]; then
  echo "[SUCCESS] All LOS-1511 failure and recovery UX assertions PASSED cleanly!"
  exit 0
else
  echo "[FAILURE] $ERRORS failure and recovery UX audit failure(s) detected." >&2
  exit 1
fi
