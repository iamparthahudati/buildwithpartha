#!/usr/bin/env bash
# validate-centralized-logs.sh — Verify LOS-1611 centralized safe logs artefacts
#
# Specification: life-os/docs/59-CENTRALIZED-SAFE-LOGS.md
#
# Usage:
#   sh life-os/scripts/validate-centralized-logs.sh           # full check
#   sh life-os/scripts/validate-centralized-logs.sh --dry-run # check without modifying anything

set -euo pipefail

# ---------------------------------------------------------------------------
# Locate repository root (works when run from any directory)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LIFE_OS="$REPO_ROOT/life-os"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
FAILURES=0
SECTION=0

section() {
  SECTION=$((SECTION + 1))
  echo ""
  echo "=== Section $SECTION: $1 ==="
}

pass() { echo "  [PASS] $1"; }
fail() { echo "  [FAIL] $1" >&2; FAILURES=$((FAILURES + 1)); }

assert_file_exists() {
  local path="$1"
  local label="${2:-$path}"
  if [[ -f "$path" ]]; then
    pass "File exists: $label"
  else
    fail "File missing: $label"
  fi
}

assert_file_contains() {
  local path="$1"
  local pattern="$2"
  local label="${3:-contains '$pattern'}"
  if grep -qF "$pattern" "$path" 2>/dev/null; then
    pass "$label"
  else
    fail "File '$path' does not contain: $pattern"
  fi
}

assert_executable() {
  local path="$1"
  local label="${2:-$path}"
  if [[ -x "$path" ]]; then
    pass "Executable: $label"
  else
    fail "Not executable: $label"
  fi
}

assert_all_services_have_logging() {
  local compose_file="$1"
  local label="$2"
  shift 2
  local services=("$@")
  for svc in "${services[@]}"; do
    # Each service block must be followed by a json-file logging stanza.
    # We verify the compose file contains the required logging options.
    if grep -qF 'driver: "json-file"' "$compose_file" && \
       grep -qF 'max-size: "100m"' "$compose_file" && \
       grep -qF 'max-file: "14"' "$compose_file" && \
       grep -qF 'compress: "true"' "$compose_file"; then
      pass "$label — logging options present (driver, max-size, max-file, compress)"
      break
    else
      fail "$label — missing required logging options (driver: json-file, max-size, max-file, compress)"
      break
    fi
  done

  # Count occurrences — should appear at least once per service
  local driver_count
  driver_count=$(grep -c 'driver: "json-file"' "$compose_file" 2>/dev/null || echo 0)
  local expected="${#services[@]}"
  if [[ "$driver_count" -ge "$expected" ]]; then
    pass "$label — json-file driver defined for all $expected service(s) (found $driver_count)"
  else
    fail "$label — json-file driver found $driver_count time(s), expected at least $expected"
  fi
}

# ---------------------------------------------------------------------------
# Section 1: Specification document
# ---------------------------------------------------------------------------
section "Specification document"

SPEC_DOC="$LIFE_OS/docs/59-CENTRALIZED-SAFE-LOGS.md"
assert_file_exists "$SPEC_DOC" "docs/59-CENTRALIZED-SAFE-LOGS.md"
assert_file_contains "$SPEC_DOC" "rotation" "spec: rotation policy described"
assert_file_contains "$SPEC_DOC" "retention" "spec: retention policy described"
assert_file_contains "$SPEC_DOC" "redact" "spec: redaction described"
assert_file_contains "$SPEC_DOC" "correlationId" "spec: correlation search described"
assert_file_contains "$SPEC_DOC" "disk-pressure" "spec: disk-pressure protection described"
assert_file_contains "$SPEC_DOC" "protected" "spec: protected access described"

# ---------------------------------------------------------------------------
# Section 2: Logrotate configuration — production
# ---------------------------------------------------------------------------
section "Logrotate configuration — production"

LOGROTATE_CONF="$LIFE_OS/infra/logrotate/lifeos-logs.conf"
assert_file_exists "$LOGROTATE_CONF" "infra/logrotate/lifeos-logs.conf"
assert_file_contains "$LOGROTATE_CONF" "rotate 14"       "logrotate: rotate 14 (14-day retention)"
assert_file_contains "$LOGROTATE_CONF" "compress"        "logrotate: compress enabled"
assert_file_contains "$LOGROTATE_CONF" "delaycompress"   "logrotate: delaycompress enabled"
assert_file_contains "$LOGROTATE_CONF" "maxsize 500M"    "logrotate: maxsize 500M disk-pressure guard"
assert_file_contains "$LOGROTATE_CONF" "create 0640"     "logrotate: owner-only + deploy-group file permissions"
assert_file_contains "$LOGROTATE_CONF" "daily"           "logrotate: daily rotation schedule"
assert_file_contains "$LOGROTATE_CONF" "missingok"       "logrotate: missingok (graceful on absent files)"
assert_file_contains "$LOGROTATE_CONF" "notifempty"      "logrotate: notifempty (skip empty files)"

# ---------------------------------------------------------------------------
# Section 3: Logrotate configuration — staging
# ---------------------------------------------------------------------------
section "Logrotate configuration — staging"

LOGROTATE_STAGING="$LIFE_OS/infra/logrotate/lifeos-logs.staging.conf"
assert_file_exists "$LOGROTATE_STAGING" "infra/logrotate/lifeos-logs.staging.conf"
assert_file_contains "$LOGROTATE_STAGING" "rotate 7"    "logrotate staging: rotate 7 (7-day retention)"
assert_file_contains "$LOGROTATE_STAGING" "maxsize 200M" "logrotate staging: maxsize 200M disk guard"

# ---------------------------------------------------------------------------
# Section 4: Logrotate README
# ---------------------------------------------------------------------------
section "Logrotate README"

LOGROTATE_README="$LIFE_OS/infra/logrotate/README.md"
assert_file_exists "$LOGROTATE_README" "infra/logrotate/README.md"
assert_file_contains "$LOGROTATE_README" "/etc/logrotate.d/lifeos" "README: deploy target path documented"
assert_file_contains "$LOGROTATE_README" "logrotate -d" "README: dry-run verification command documented"

# ---------------------------------------------------------------------------
# Section 5: Docker logging driver — compose.prod.yml
# ---------------------------------------------------------------------------
section "Docker logging driver — compose.prod.yml"

PROD_COMPOSE="$LIFE_OS/infra/compose/compose.prod.yml"
assert_file_exists "$PROD_COMPOSE" "infra/compose/compose.prod.yml"
assert_all_services_have_logging "$PROD_COMPOSE" "compose.prod.yml" caddy web api postgres

# ---------------------------------------------------------------------------
# Section 6: Docker logging driver — compose.monitoring.yml
# ---------------------------------------------------------------------------
section "Docker logging driver — compose.monitoring.yml"

MONITORING_COMPOSE="$LIFE_OS/infra/compose/compose.monitoring.yml"
assert_file_exists "$MONITORING_COMPOSE" "infra/compose/compose.monitoring.yml"
assert_all_services_have_logging "$MONITORING_COMPOSE" "compose.monitoring.yml" \
  prometheus alertmanager blackbox-exporter node-exporter postgres-exporter

# ---------------------------------------------------------------------------
# Section 7: Correlation search script
# ---------------------------------------------------------------------------
section "Correlation search script"

SEARCH_SCRIPT="$LIFE_OS/scripts/search-logs-by-correlation.sh"
assert_file_exists "$SEARCH_SCRIPT" "scripts/search-logs-by-correlation.sh"

# Make executable if not already (only in non-dry-run mode)
if [[ ! -x "$SEARCH_SCRIPT" ]]; then
  if [[ "$DRY_RUN" == false ]]; then
    chmod +x "$SEARCH_SCRIPT"
    pass "scripts/search-logs-by-correlation.sh — made executable"
  else
    fail "scripts/search-logs-by-correlation.sh — not executable (would chmod +x in non-dry-run)"
  fi
else
  assert_executable "$SEARCH_SCRIPT" "scripts/search-logs-by-correlation.sh"
fi

assert_file_contains "$SEARCH_SCRIPT" "correlationId"   "search script: correlationId field supported"
assert_file_contains "$SEARCH_SCRIPT" "traceId"         "search script: traceId field supported"
assert_file_contains "$SEARCH_SCRIPT" "docker logs"     "search script: uses docker logs"
assert_file_contains "$SEARCH_SCRIPT" "jq"              "search script: uses jq for JSON parsing"
assert_file_contains "$SEARCH_SCRIPT" "SINCE="          "search script: --since time range supported"
assert_file_contains "$SEARCH_SCRIPT" "SERVICE="        "search script: --service filter supported"

# Verify script parses --help without error
if bash "$SEARCH_SCRIPT" --help &>/dev/null; then
  pass "search script: --help exits cleanly"
else
  fail "search script: --help returned non-zero exit code"
fi

# ---------------------------------------------------------------------------
# Section 8: Redaction implementation present (LOS-1411)
# ---------------------------------------------------------------------------
section "Redaction implementation (StructuredJsonLayout from LOS-1411)"

STRUCTURED_LAYOUT="$LIFE_OS/apps/api/src/main/java/tech/buildwithpartha/lifeos/common/logging/StructuredJsonLayout.java"
assert_file_exists "$STRUCTURED_LAYOUT" "StructuredJsonLayout.java"

STRUCTURED_TESTS="$LIFE_OS/apps/api/src/test/java/tech/buildwithpartha/lifeos/common/logging/StructuredLoggingTests.java"
assert_file_exists "$STRUCTURED_TESTS" "StructuredLoggingTests.java"

LOGBACK_CONFIG="$LIFE_OS/apps/api/src/main/resources/logback-spring.xml"
assert_file_exists "$LOGBACK_CONFIG" "logback-spring.xml"
assert_file_contains "$LOGBACK_CONFIG" "StructuredJsonLayout" "logback: StructuredJsonLayout wired for prod profile"
assert_file_contains "$LOGBACK_CONFIG" "prod"                  "logback: prod profile activated"

# ---------------------------------------------------------------------------
# Section 9: Documentation updates
# ---------------------------------------------------------------------------
section "Documentation updates"

BACKLOG="$LIFE_OS/docs/backlog/EPIC-16-INFRA-LAUNCH.md"
assert_file_exists "$BACKLOG" "docs/backlog/EPIC-16-INFRA-LAUNCH.md"
assert_file_contains "$BACKLOG" "LOS-1611" "backlog: LOS-1611 entry exists"
assert_file_contains "$BACKLOG" "Done" "backlog: LOS-1611 marked Done"

HANDOFF="$LIFE_OS/docs/handoffs/LOS-1611.md"
assert_file_exists "$HANDOFF" "docs/handoffs/LOS-1611.md"
assert_file_contains "$HANDOFF" "LOS-1611" "handoff: references LOS-1611"

CURRENT_STATUS="$LIFE_OS/docs/CURRENT-STATUS.md"
assert_file_exists "$CURRENT_STATUS" "docs/CURRENT-STATUS.md"
assert_file_contains "$CURRENT_STATUS" "LOS-1611" "CURRENT-STATUS: LOS-1611 entry present"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
if [[ $FAILURES -eq 0 ]]; then
  echo "  validate-centralized-logs.sh: ALL CHECKS PASSED (0 failures)"
  echo "============================================================"
  exit 0
else
  echo "  validate-centralized-logs.sh: $FAILURES FAILURE(S) DETECTED"
  echo "============================================================"
  exit 1
fi
