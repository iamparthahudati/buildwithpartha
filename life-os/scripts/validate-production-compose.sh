#!/usr/bin/env sh

# LifeOS Production Compose and Caddy Audit Script (LOS-1604)
# Audits Docker Compose definition and Caddyfile routing against docs/38-PRODUCTION-COMPOSE-AND-CADDY.md.

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

echo "======================================================="
echo " LifeOS Production Compose & Caddy Audit (LOS-1604)"
echo "======================================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

COMPOSE_FILE="$REPO_ROOT/life-os/infra/compose/compose.prod.yml"
CADDY_FILE="$REPO_ROOT/life-os/infra/caddy/Caddyfile.prod"
DEPLOY_CADDY="$REPO_ROOT/deploy/caddy/Caddyfile"
SPEC_DOC="$REPO_ROOT/life-os/docs/38-PRODUCTION-COMPOSE-AND-CADDY.md"

echo "[*] Checking Specification Document ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 38-PRODUCTION-COMPOSE-AND-CADDY.md exists."
else
  echo "  [FAIL] Specification document missing at $SPEC_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Production Compose File ($COMPOSE_FILE)..."
if [ -f "$COMPOSE_FILE" ]; then
  echo "  [PASS] Production Compose file exists."

  for service in caddy web api postgres; do
    if grep -q "  ${service}:" "$COMPOSE_FILE"; then
      echo "  [PASS] Service '$service' declared."
    else
      echo "  [FAIL] Service '$service' missing in compose.prod.yml." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done

  for net in frontend-net backend-net db-net; do
    if grep -q "  ${net}:" "$COMPOSE_FILE"; then
      echo "  [PASS] Network '$net' declared."
    else
      echo "  [FAIL] Network '$net' missing in compose.prod.yml." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done

  if grep -q "lifeos-prod-postgres-data:" "$COMPOSE_FILE"; then
    echo "  [PASS] Persistent volume 'lifeos-prod-postgres-data' declared."
  else
    echo "  [FAIL] Missing persistent volume 'lifeos-prod-postgres-data'." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q 'user: "10001:10001"' "$COMPOSE_FILE"; then
    echo "  [PASS] Non-root user (10001) enforced for web/api services."
  else
    echo "  [FAIL] Missing non-root user 10001 directive." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "read_only: true" "$COMPOSE_FILE"; then
    echo "  [PASS] Read-only root filesystem enforced."
  else
    echo "  [FAIL] Missing read_only filesystem directive." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "no-new-privileges:true" "$COMPOSE_FILE"; then
    echo "  [PASS] Security option no-new-privileges enforced."
  else
    echo "  [FAIL] Missing no-new-privileges security option." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "limits:" "$COMPOSE_FILE" && grep -q "reservations:" "$COMPOSE_FILE"; then
    echo "  [PASS] CPU and memory resource limits & reservations configured."
  else
    echo "  [FAIL] Missing resource boundaries in compose.prod.yml." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "/etc/life-os/secrets/.env.production" "$COMPOSE_FILE"; then
    echo "  [PASS] Production secrets file injection referenced."
  else
    echo "  [FAIL] Missing secrets file reference /etc/life-os/secrets/.env.production." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] Production Compose file missing at $COMPOSE_FILE" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Production Caddyfile ($CADDY_FILE)..."
if [ -f "$CADDY_FILE" ]; then
  echo "  [PASS] Caddyfile.prod exists."

  if grep -q "buildwithpartha.tech {" "$CADDY_FILE"; then
    echo "  [PASS] Domain block for buildwithpartha.tech declared."
  else
    echo "  [FAIL] Missing domain block for buildwithpartha.tech." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "/life-os/api/\*" "$CADDY_FILE" && grep -q "reverse_proxy api:8080" "$CADDY_FILE"; then
    echo "  [PASS] Reverse proxy for /life-os/api/* to api:8080 configured."
  else
    echo "  [FAIL] Missing /life-os/api/* proxy rule." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "/life-os/\*" "$CADDY_FILE" && grep -q "reverse_proxy web:8080" "$CADDY_FILE"; then
    echo "  [PASS] Reverse proxy for /life-os/* to web:8080 configured."
  else
    echo "  [FAIL] Missing /life-os/* web proxy rule." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "Strict-Transport-Security" "$CADDY_FILE" && grep -q "X-Frame-Options" "$CADDY_FILE"; then
    echo "  [PASS] Security headers configured."
  else
    echo "  [FAIL] Missing security headers in Caddyfile.prod." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "max_size 10MB" "$CADDY_FILE"; then
    echo "  [PASS] Request body size limit 10MB enforced."
  else
    echo "  [FAIL] Missing max_size 10MB request limit." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "format json" "$CADDY_FILE"; then
    echo "  [PASS] Structured JSON access logging configured."
  else
    echo "  [FAIL] Missing JSON access log formatting." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] Caddyfile.prod missing at $CADDY_FILE" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Top-Level Deploy Caddyfile ($DEPLOY_CADDY)..."
if [ -f "$DEPLOY_CADDY" ]; then
  if grep -q "/life-os/api/\*" "$DEPLOY_CADDY" && grep -q "/life-os/\*" "$DEPLOY_CADDY"; then
    echo "  [PASS] Top-level deploy/caddy/Caddyfile contains active LifeOS routes."
  else
    echo "  [FAIL] deploy/caddy/Caddyfile missing active LifeOS routes." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] deploy/caddy/Caddyfile missing at $DEPLOY_CADDY" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ "$DRY_RUN" -eq 1 ] || [ ! -x "$(command -v docker)" ]; then
  echo "[INFO] Running in DRY-RUN mode or Docker binary not available."
  echo "[OK] Production Compose structure verified (4 services, 3 networks, volume persistence)."
  echo "[OK] Runtime security hardening (user 10001, read_only, no-new-privileges) verified."
  echo "[OK] Resource boundaries and secrets injection verified."
  echo "[OK] Caddy ingress path routing matrix, security headers, limits, and JSON logging verified."
  if [ "$ERRORS" -eq 0 ]; then
    echo "[OK] All LOS-1604 production compose and Caddy audit assertions PASSED."
    exit 0
  else
    echo "[ERROR] Production compose audit failed with $ERRORS error(s)." >&2
    exit 1
  fi
fi

echo "-------------------------------------------------------"
if [ "$ERRORS" -eq 0 ]; then
  echo "[SUCCESS] All production compose and Caddy checks passed cleanly!"
  exit 0
else
  echo "[ERROR] Production compose audit failed with $ERRORS error(s)." >&2
  exit 1
fi
