#!/usr/bin/env sh

# LifeOS Performance Budgets and Benchmarks Audit Script (LOS-1510)
# Audits bundle budgets, Core Web Vitals, API latency SLAs, query execution, and resource allocation specifications and tests against docs/54-PERFORMANCE-BUDGETS-AND-BENCHMARKS.md.

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
echo " LifeOS Performance Budgets & Benchmarks Audit (LOS-1510)"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

SPEC_DOC="$REPO_ROOT/life-os/docs/54-PERFORMANCE-BUDGETS-AND-BENCHMARKS.md"
BUNDLE_SCRIPT="$REPO_ROOT/life-os/apps/web/scripts/verify-bundle-budgets.mjs"
BUNDLE_TEST="$REPO_ROOT/life-os/apps/web/tests/bundle-budgets.test.mjs"
ROUTE_LOADERS="$REPO_ROOT/life-os/apps/web/src/app/routeLoaders.ts"
APP_ROUTER="$REPO_ROOT/life-os/apps/web/src/app/AppRouter.tsx"
PERF_LIB="$REPO_ROOT/life-os/apps/web/src/lib/performance.ts"
PERF_TEST="$REPO_ROOT/life-os/apps/web/src/lib/performance.test.ts"
BACKEND_PERF_TEST="$REPO_ROOT/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/common/performance/PerformanceBudgetsIntegrationTests.java"
WEB_PKG="$REPO_ROOT/life-os/apps/web/package.json"

# 1. Check Specification Document
echo "[*] Auditing Performance Budgets Specification ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 54-PERFORMANCE-BUDGETS-AND-BENCHMARKS.md exists."

  for keyword in "LOS-1510" "Frontend Bundle & Asset Budgets" "Core Web Vitals" "Backend API Latency SLAs" "Database Query Performance" "Container & Process Resource Allocations" "Large-Data Volume Scalability" "PERF-01" "PERF-10" "Accepted"; do
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

# 2. Check Frontend Bundle Budget Verifiers and Tests
echo "[*] Auditing Frontend Bundle Verification and Automation..."
if [ -f "$BUNDLE_SCRIPT" ]; then
  echo "  [PASS] verify-bundle-budgets.mjs exists."
  for budget in "entryJsMaxBytes" "routeChunkMaxBytes" "vendorChunkMaxBytes" "entryCssMaxBytes"; do
    if grep -q "$budget" "$BUNDLE_SCRIPT"; then
      echo "  [PASS] verify-bundle-budgets.mjs enforces threshold '$budget'."
    else
      echo "  [FAIL] verify-bundle-budgets.mjs missing threshold: '$budget'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] verify-bundle-budgets.mjs missing at $BUNDLE_SCRIPT" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ -f "$BUNDLE_TEST" ]; then
  echo "  [PASS] bundle-budgets.test.mjs exists."
else
  echo "  [FAIL] bundle-budgets.test.mjs missing at $BUNDLE_TEST" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ -f "$WEB_PKG" ] && grep -q '"verify:budgets"' "$WEB_PKG"; then
  echo "  [PASS] apps/web package.json defines 'verify:budgets' script."
else
  echo "  [FAIL] apps/web package.json missing 'verify:budgets' script." >&2
  ERRORS=$((ERRORS + 1))
fi

# 3. Check Lazy Route Code Splitting
echo "[*] Auditing Frontend Route Code Splitting..."
if [ -f "$ROUTE_LOADERS" ]; then
  echo "  [PASS] routeLoaders.ts exists."
  ROUTE_COUNT=$(grep -c "Route:" "$ROUTE_LOADERS" || true)
  if [ "$ROUTE_COUNT" -ge 30 ]; then
    echo "  [PASS] routeLoaders.ts defines dynamic imports for $ROUTE_COUNT routes."
  else
    echo "  [FAIL] routeLoaders.ts defines insufficient dynamic route loaders ($ROUTE_COUNT < 30)." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] routeLoaders.ts missing at $ROUTE_LOADERS" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ -f "$APP_ROUTER" ] && grep -q "lazy(" "$APP_ROUTER" && grep -q "ROUTE_LOADERS" "$APP_ROUTER"; then
  echo "  [PASS] AppRouter.tsx utilizes lazy and ROUTE_LOADERS for dynamic route chunking."
else
  echo "  [FAIL] AppRouter.tsx missing lazy or ROUTE_LOADERS wiring." >&2
  ERRORS=$((ERRORS + 1))
fi

# 4. Check CWV Runtime Module & Unit Tests
echo "[*] Auditing Core Web Vitals Runtime & Evaluation..."
if [ -f "$PERF_LIB" ]; then
  echo "  [PASS] performance.ts exists."
  for metric in "LCP" "INP" "CLS" "FCP" "TTFB" "evaluateMetric" "observePerformanceMetrics"; do
    if grep -q "$metric" "$PERF_LIB"; then
      echo "  [PASS] performance.ts exports and measures '$metric'."
    else
      echo "  [FAIL] performance.ts missing metric/helper: '$metric'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] performance.ts missing at $PERF_LIB" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ -f "$PERF_TEST" ]; then
  echo "  [PASS] performance.test.ts exists."
else
  echo "  [FAIL] performance.test.ts missing at $PERF_TEST" >&2
  ERRORS=$((ERRORS + 1))
fi

# 5. Check Backend Performance & SLA Test Suite
echo "[*] Auditing Backend API Latency SLAs & Scalability Tests..."
if [ -f "$BACKEND_PERF_TEST" ]; then
  echo "  [PASS] PerformanceBudgetsIntegrationTests.java exists."
  for test_method in "fastTierEndpointLatencyUnderBudget" "standardCrudTierLatencyUnderBudget" "aggregationTierLatencyUnderBudget" "largeDataVolumeTaskQueryScalability" "largeDataVolumeHabitEntriesScalability" "databaseQueryExecutionLatencyUnderBudget" "memoryAndResourceAllocationBounds"; do
    if grep -q "$test_method" "$BACKEND_PERF_TEST"; then
      echo "  [PASS] Backend suite implements '$test_method'."
    else
      echo "  [FAIL] Backend suite missing method '$test_method'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] PerformanceBudgetsIntegrationTests.java missing at $BACKEND_PERF_TEST" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "------------------------------------------------------"
if [ "$ERRORS" -eq 0 ]; then
  echo "[SUCCESS] All LOS-1510 performance budgets and benchmark assertions PASSED cleanly!"
  exit 0
else
  echo "[FAILURE] $ERRORS performance budget audit failure(s) detected." >&2
  exit 1
fi
