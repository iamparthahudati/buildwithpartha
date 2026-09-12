#!/usr/bin/env bash
# search-logs-by-correlation.sh — Search LifeOS container logs by correlationId, traceId, or text
#
# Specification: life-os/docs/59-CENTRALIZED-SAFE-LOGS.md (LOS-1611)
#
# Usage:
#   search-logs-by-correlation.sh --id <correlationId|traceId|text>
#                                  [--field correlationId|traceId|message|any]
#                                  [--service api|caddy|web|postgres|all]
#                                  [--since <duration>]   e.g. 1h, 30m, 2h, 24h
#                                  [--until <timestamp>]  ISO-8601 (e.g. 2026-09-12T04:00:00Z)
#                                  [--raw]                Print raw JSON lines
#                                  [--no-color]           Disable colour output
#
# Examples:
#   # Find all log lines for a specific HTTP request correlation ID (last 1 hour)
#   search-logs-by-correlation.sh --id "a1b2c3d4" --service api --since 1h
#
#   # Search all services for a trace ID in the last 2 hours
#   search-logs-by-correlation.sh --id "4bf92f3577b34da6" --field traceId --since 2h
#
#   # Find all log lines related to a background job in the last 30 minutes
#   search-logs-by-correlation.sh --id "job-" --field correlationId --service api --since 30m
#
#   # Search raw text across all services (useful for error message lookup)
#   search-logs-by-correlation.sh --id "FlywayMigrationException" --field any --since 4h

set -euo pipefail

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
COLOUR_RESET=""
COLOUR_CYAN=""
COLOUR_YELLOW=""
COLOUR_RED=""
COLOUR_GREEN=""
COLOUR_GREY=""

enable_colour() {
  COLOUR_RESET="\033[0m"
  COLOUR_CYAN="\033[0;36m"
  COLOUR_YELLOW="\033[0;33m"
  COLOUR_RED="\033[0;31m"
  COLOUR_GREEN="\033[0;32m"
  COLOUR_GREY="\033[0;90m"
}

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
SEARCH_ID=""
SEARCH_FIELD="correlationId"
SERVICE="all"
SINCE="1h"
UNTIL=""
RAW=false
NO_COLOUR=false

KNOWN_SERVICES=(lifeos-api lifeos-caddy lifeos-web lifeos-postgres)
ALL_SERVICES=("${KNOWN_SERVICES[@]}")

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
usage() {
  cat <<EOF
Usage: $(basename "$0") --id <value> [options]

Options:
  --id <value>           Search value (correlationId, traceId, or text)
  --field <field>        JSON field to match: correlationId (default), traceId, message, any
  --service <name>       Service to search: api, caddy, web, postgres, all (default: all)
  --since <duration>     Look back duration (default: 1h). Examples: 30m, 2h, 24h
  --until <timestamp>    Upper bound timestamp (ISO-8601, e.g. 2026-09-12T04:00:00Z)
  --raw                  Print raw JSON lines (default: formatted summary)
  --no-colour            Disable colour output
  -h, --help             Show this help

Examples:
  $(basename "$0") --id "abc123" --service api --since 2h
  $(basename "$0") --id "4bf92f" --field traceId --since 4h
  $(basename "$0") --id "job-" --field correlationId --since 30m
  $(basename "$0") --id "OutOfMemoryError" --field any --since 12h
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --id)       SEARCH_ID="$2"; shift 2 ;;
    --field)    SEARCH_FIELD="$2"; shift 2 ;;
    --service)  SERVICE="$2"; shift 2 ;;
    --since)    SINCE="$2"; shift 2 ;;
    --until)    UNTIL="$2"; shift 2 ;;
    --raw)      RAW=true; shift ;;
    --no-colour|--no-color) NO_COLOUR=true; shift ;;
    -h|--help)  usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -z "$SEARCH_ID" ]]; then
  echo "Error: --id is required." >&2
  usage >&2
  exit 1
fi

if [[ "$NO_COLOUR" == false ]] && [[ -t 1 ]]; then
  enable_colour
fi

# ---------------------------------------------------------------------------
# Resolve target containers
# ---------------------------------------------------------------------------
resolve_containers() {
  local svc="$1"
  case "$svc" in
    api)      echo "lifeos-api" ;;
    caddy)    echo "lifeos-caddy" ;;
    web)      echo "lifeos-web" ;;
    postgres) echo "lifeos-postgres" ;;
    all)      echo "${ALL_SERVICES[*]}" ;;
    *)        echo "Error: Unknown service '$svc'. Use: api, caddy, web, postgres, all" >&2; exit 1 ;;
  esac
}

# ---------------------------------------------------------------------------
# Check docker availability
# ---------------------------------------------------------------------------
if ! command -v docker &>/dev/null; then
  echo "Error: docker is not installed or not in PATH." >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "Error: jq is not installed. Install with: apt-get install jq  OR  brew install jq" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Build docker logs flags
# ---------------------------------------------------------------------------
DOCKER_LOG_FLAGS=("--since" "$SINCE")
if [[ -n "$UNTIL" ]]; then
  DOCKER_LOG_FLAGS+=("--until" "$UNTIL")
fi

# ---------------------------------------------------------------------------
# jq filter construction
# ---------------------------------------------------------------------------
build_jq_filter() {
  local field="$1"
  local id="$2"

  case "$field" in
    correlationId)
      echo ". | select((.correlationId // \"\") | contains(\"$id\"))"
      ;;
    traceId)
      echo ". | select((.traceId // \"\") | contains(\"$id\"))"
      ;;
    message)
      echo ". | select((.message // \"\") | contains(\"$id\"))"
      ;;
    any)
      # Search across all string fields: correlationId, traceId, message, logger, jobKind
      echo ". | select(
        ((.correlationId // \"\") | contains(\"$id\")) or
        ((.traceId // \"\") | contains(\"$id\")) or
        ((.message // \"\") | contains(\"$id\")) or
        ((.logger // \"\") | contains(\"$id\")) or
        ((.jobKind // \"\") | contains(\"$id\"))
      )"
      ;;
    *)
      echo "Error: Unknown field '$field'. Use: correlationId, traceId, message, any" >&2
      exit 1
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Format a matched JSON log line for human-readable output
# ---------------------------------------------------------------------------
format_line() {
  local json="$1"
  local ts level correlationId traceId logger message

  ts=$(echo "$json" | jq -r '.timestamp // .ts // "?"')
  level=$(echo "$json" | jq -r '.level // "?"')
  correlationId=$(echo "$json" | jq -r '.correlationId // ""')
  traceId=$(echo "$json" | jq -r '.traceId // ""')
  logger=$(echo "$json" | jq -r '.logger // ""' | awk -F'.' '{print $NF}')
  message=$(echo "$json" | jq -r '.message // ""')

  local level_colour="$COLOUR_RESET"
  case "$level" in
    ERROR)  level_colour="$COLOUR_RED" ;;
    WARN)   level_colour="$COLOUR_YELLOW" ;;
    INFO)   level_colour="$COLOUR_GREEN" ;;
    DEBUG)  level_colour="$COLOUR_GREY" ;;
  esac

  local cid_part=""
  [[ -n "$correlationId" ]] && cid_part=" ${COLOUR_CYAN}[correlationId=$correlationId]${COLOUR_RESET}"
  local tid_part=""
  [[ -n "$traceId" ]] && tid_part=" ${COLOUR_GREY}[traceId=$traceId]${COLOUR_RESET}"

  printf "${COLOUR_GREY}[%s]${COLOUR_RESET} ${level_colour}[%s]${COLOUR_RESET}%s%s ${COLOUR_GREY}%s${COLOUR_RESET} — %s\n" \
    "$ts" "$level" "$cid_part" "$tid_part" "$logger" "$message"
}

# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------
JQ_FILTER=$(build_jq_filter "$SEARCH_FIELD" "$SEARCH_ID")

read -ra CONTAINERS <<< "$(resolve_containers "$SERVICE")"

TOTAL_MATCHES=0

for container in "${CONTAINERS[@]}"; do
  # Check if container is running
  if ! docker inspect "$container" &>/dev/null; then
    echo -e "${COLOUR_GREY}[skip] Container '$container' not found or not running.${COLOUR_RESET}"
    continue
  fi

  echo -e "${COLOUR_CYAN}=== $container ===${COLOUR_RESET}"

  CONTAINER_MATCHES=0

  while IFS= read -r line; do
    # Docker json-file driver wraps each log line in {"log":"...","stream":"...","time":"..."}
    # We need to extract the inner log content and parse it as JSON
    inner=$(echo "$line" | jq -r '.log // empty' 2>/dev/null || echo "$line")

    # Try to parse as structured JSON (API logs via StructuredJsonLayout)
    if parsed=$(echo "$inner" | jq -c "$JQ_FILTER" 2>/dev/null) && [[ -n "$parsed" ]]; then
      if [[ "$RAW" == true ]]; then
        echo "$parsed"
      else
        format_line "$parsed"
      fi
      ((CONTAINER_MATCHES++)) || true
    else
      # For non-JSON logs (caddy, postgres, web nginx) fall back to plain grep
      if echo "$inner" | grep -qF "$SEARCH_ID" 2>/dev/null; then
        if [[ "$RAW" == true ]]; then
          echo "$inner"
        else
          echo -e "${COLOUR_GREY}[raw]${COLOUR_RESET} $inner"
        fi
        ((CONTAINER_MATCHES++)) || true
      fi
    fi
  done < <(docker logs "${DOCKER_LOG_FLAGS[@]}" "$container" 2>&1)

  echo -e "${COLOUR_GREY}  → $CONTAINER_MATCHES match(es)${COLOUR_RESET}"
  ((TOTAL_MATCHES += CONTAINER_MATCHES)) || true
done

echo ""
if [[ $TOTAL_MATCHES -eq 0 ]]; then
  echo -e "${COLOUR_YELLOW}No matches found for '$SEARCH_ID' in field '$SEARCH_FIELD' (since: $SINCE).${COLOUR_RESET}"
  exit 1
else
  echo -e "${COLOUR_GREEN}Total: $TOTAL_MATCHES match(es) found for '$SEARCH_ID'.${COLOUR_RESET}"
  exit 0
fi
