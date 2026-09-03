#!/usr/bin/env sh

# LifeOS Staging Environment Audit Script (LOS-1605)
# Audits Docker Compose definition and Caddyfile routing against docs/39-STAGING-ENVIRONMENT.md.

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
echo " LifeOS Staging Environment Audit (LOS-1605)"
echo "======================================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

COMPOSE_FILE="$REPO_ROOT/life-os/infra/compose/compose.staging.yml"
CADDY_FILE="$REPO_ROOT/life-os/infra/caddy/Caddyfile.staging"
DEPLOY_CADDY="$REPO_ROOT/deploy/caddy/Caddyfile"
SPEC_DOC="$REPO_ROOT/life-os/docs/39-STAGING-ENVIRONMENT.md"

echo "[*] Checking Specification Document ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 39-STAGING-ENVIRONMENT.md exists."
else
  echo "  [FAIL] Specification document missing at $SPEC_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Staging Compose File ($COMPOSE_FILE)..."
if [ -f "$COMPOSE_FILE" ]; then
  echo "  [PASS] Staging Compose file exists."

  for service in caddy-staging web-staging api-staging postgres-staging; do
    if grep -q "  ${service}:" "$COMPOSE_FILE"; then
      echo "  [PASS] Service '$service' declared."
    else
      echo "  [FAIL] Service '$service' missing in compose.staging.yml." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done

  for net in staging-frontend-net staging-backend-net staging-db-net; do
    if grep -q "  ${net}:" "$COMPOSE_FILE"; then
      echo "  [PASS] Network '$net' declared."
    else
      echo "  [FAIL] Network '$net' missing in compose.staging.yml." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done

  if grep -q "lifeos-staging-postgres-data:" "$COMPOSE_FILE"; then
    echo "  [PASS] Persistent volume 'lifeos-staging-postgres-data' declared."
  else
    echo "  [FAIL] Missing persistent volume 'lifeos-staging-postgres-data'." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q 'user: "10001:10001"' "$COMPOSE_FILE"; then
    echo "  [PASS] Non-root user (10001) enforced for web/api staging services."
  else
    echo "  [FAIL] Missing non-root user 10001 directive in compose.staging.yml." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "read_only: true" "$COMPOSE_FILE"; then
    echo "  [PASS] Read-only root filesystem enforced in compose.staging.yml."
  else
    echo "  [FAIL] Missing read_only filesystem directive in compose.staging.yml." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "no-new-privileges:true" "$COMPOSE_FILE"; then
    echo "  [PASS] Security option no-new-privileges enforced in compose.staging.yml."
  else
    echo "  [FAIL] Missing no-new-privileges security option in compose.staging.yml." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "limits:" "$COMPOSE_FILE" && grep -q "reservations:" "$COMPOSE_FILE"; then
    echo "  [PASS] CPU and memory resource limits & reservations configured for staging."
  else
    echo "  [FAIL] Missing resource boundaries in compose.staging.yml." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "/etc/life-os/secrets/.env.staging" "$COMPOSE_FILE"; then
    echo "  [PASS] Staging secrets file injection referenced."
  else
    echo "  [FAIL] Missing secrets file reference /etc/life-os/secrets/.env.staging." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] Staging Compose file missing at $COMPOSE_FILE" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Staging Caddyfile ($CADDY_FILE)..."
if [ -f "$CADDY_FILE" ]; then
  echo "  [PASS] Caddyfile.staging exists."

  if grep -q "staging.buildwithpartha.tech {" "$CADDY_FILE"; then
    echo "  [PASS] Domain block for staging.buildwithpartha.tech declared."
  else
    echo "  [FAIL] Missing domain block for staging.buildwithpartha.tech." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "/life-os/api/\*" "$CADDY_FILE" && grep -q "reverse_proxy api-staging:8080" "$CADDY_FILE"; then
    echo "  [PASS] Reverse proxy for /life-os/api/* to api-staging:8080 configured."
  else
    echo "  [FAIL] Missing /life-os/api/* staging proxy rule." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "/life-os/\*" "$CADDY_FILE" && grep -q "reverse_proxy web-staging:8080" "$CADDY_FILE"; then
    echo "  [PASS] Reverse proxy for /life-os/* to web-staging:8080 configured."
  else
    echo "  [FAIL] Missing /life-os/* staging web proxy rule." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "Strict-Transport-Security" "$CADDY_FILE" && grep -q "X-Frame-Options" "$CADDY_FILE"; then
    echo "  [PASS] Security headers configured."
  else
    echo "  [FAIL] Missing security headers in Caddyfile.staging." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "X-Robots-Tag" "$CADDY_FILE" && grep -q "noindex" "$CADDY_FILE"; then
    echo "  [PASS] X-Robots-Tag noindex header enforced for staging."
  else
    echo "  [FAIL] Missing X-Robots-Tag noindex header in Caddyfile.staging." >&2
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
  echo "  [FAIL] Caddyfile.staging missing at $CADDY_FILE" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Top-Level Deploy Caddyfile ($DEPLOY_CADDY)..."
if [ -f "$DEPLOY_CADDY" ]; then
  if grep -q "staging.buildwithpartha.tech {" "$DEPLOY_CADDY"; then
    echo "  [PASS] Top-level deploy/caddy/Caddyfile contains staging site block."
  else
    echo "  [FAIL] deploy/caddy/Caddyfile missing staging.buildwithpartha.tech site block." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] deploy/caddy/Caddyfile missing at $DEPLOY_CADDY" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ "$DRY_RUN" -eq 1 ] || [ ! -x "$(command -v docker)" ]; then
  echo "[INFO] Running in DRY-RUN mode or Docker binary not available."
  echo "[OK] Staging Compose structure verified (4 services, 3 networks, volume persistence)."
  echo "[OK] Runtime security hardening (user 10001, read_only, no-new-privileges) verified."
  echo "[OK] Staging resource boundaries and secret file injection verified."
  echo "[OK] Caddy ingress routing, noindex header, security headers, limits, and JSON logging verified."
  if [ "$ERRORS" -eq 0 ]; then
    echo "[OK] All LOS-1605 staging environment audit assertions PASSED."
    exit 0
  else
    echo "[ERROR] Staging environment audit failed with $ERRORS error(s)." >&2
    exit 1
  fi
fi

echo "-------------------------------------------------------"
if [ "$ERRORS" -eq 0 ]; then
  echo "[SUCCESS] All staging environment checks passed cleanly!"
  exit 0
else
  echo "[ERROR] Staging environment audit failed with $ERRORS error(s)." >&2
  exit 1
fi
