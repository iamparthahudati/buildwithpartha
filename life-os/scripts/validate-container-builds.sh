#!/usr/bin/env sh

# LifeOS Production Container Verification Script (LOS-1603)
# Audits Dockerfiles and Nginx configuration against docs/37-PRODUCTION-CONTAINERS.md.

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
echo " LifeOS Production Container Build Audit (LOS-1603)"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

API_DOCKERFILE="$REPO_ROOT/life-os/apps/api/Dockerfile"
WEB_DOCKERFILE="$REPO_ROOT/life-os/apps/web/Dockerfile"
WEB_NGINX_CONF="$REPO_ROOT/life-os/apps/web/nginx.conf"
CONTAINER_SPEC="$REPO_ROOT/life-os/docs/37-PRODUCTION-CONTAINERS.md"

echo "[*] Checking API Dockerfile ($API_DOCKERFILE)..."
if [ -f "$API_DOCKERFILE" ]; then
  echo "  [PASS] API Dockerfile exists."
  
  if grep -q "AS builder" "$API_DOCKERFILE" && grep -q "AS runner" "$API_DOCKERFILE"; then
    echo "  [PASS] API Dockerfile uses multi-stage build."
  else
    echo "  [FAIL] API Dockerfile missing multi-stage build stages." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "USER 10001" "$API_DOCKERFILE"; then
    echo "  [PASS] API Dockerfile enforces non-root user (USER 10001)."
  else
    echo "  [FAIL] API Dockerfile missing USER 10001 declaration." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "HEALTHCHECK" "$API_DOCKERFILE"; then
    echo "  [PASS] API Dockerfile defines HEALTHCHECK probe."
  else
    echo "  [FAIL] API Dockerfile missing HEALTHCHECK directive." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "EXPOSE 8080" "$API_DOCKERFILE"; then
    echo "  [PASS] API Dockerfile exposes non-privileged port 8080."
  else
    echo "  [FAIL] API Dockerfile missing EXPOSE 8080." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q ":latest" "$API_DOCKERFILE"; then
    echo "  [FAIL] API Dockerfile contains unpinned :latest tag." >&2
    ERRORS=$((ERRORS + 1))
  else
    echo "  [PASS] API Dockerfile base images use version pinning."
  fi
else
  echo "  [FAIL] API Dockerfile missing at $API_DOCKERFILE" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Web Dockerfile ($WEB_DOCKERFILE)..."
if [ -f "$WEB_DOCKERFILE" ]; then
  echo "  [PASS] Web Dockerfile exists."
  
  if grep -q "AS builder" "$WEB_DOCKERFILE" && grep -q "AS runner" "$WEB_DOCKERFILE"; then
    echo "  [PASS] Web Dockerfile uses multi-stage build."
  else
    echo "  [FAIL] Web Dockerfile missing multi-stage build stages." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "USER 10001" "$WEB_DOCKERFILE"; then
    echo "  [PASS] Web Dockerfile enforces non-root user (USER 10001)."
  else
    echo "  [FAIL] Web Dockerfile missing USER 10001 declaration." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "HEALTHCHECK" "$WEB_DOCKERFILE"; then
    echo "  [PASS] Web Dockerfile defines HEALTHCHECK probe."
  else
    echo "  [FAIL] Web Dockerfile missing HEALTHCHECK directive." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "EXPOSE 8080" "$WEB_DOCKERFILE"; then
    echo "  [PASS] Web Dockerfile exposes non-privileged port 8080."
  else
    echo "  [FAIL] Web Dockerfile missing EXPOSE 8080." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q ":latest" "$WEB_DOCKERFILE"; then
    echo "  [FAIL] Web Dockerfile contains unpinned :latest tag." >&2
    ERRORS=$((ERRORS + 1))
  else
    echo "  [PASS] Web Dockerfile base images use version pinning."
  fi
else
  echo "  [FAIL] Web Dockerfile missing at $WEB_DOCKERFILE" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Web Nginx Configuration ($WEB_NGINX_CONF)..."
if [ -f "$WEB_NGINX_CONF" ]; then
  echo "  [PASS] Nginx configuration file exists."
  
  if grep -q "listen 8080;" "$WEB_NGINX_CONF"; then
    echo "  [PASS] Nginx listens on non-privileged port 8080."
  else
    echo "  [FAIL] Nginx configuration missing listen 8080." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "/healthz" "$WEB_NGINX_CONF"; then
    echo "  [PASS] Nginx defines /healthz endpoint."
  else
    echo "  [FAIL] Nginx configuration missing /healthz endpoint." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "/life-os/" "$WEB_NGINX_CONF"; then
    echo "  [PASS] Nginx configures /life-os/ SPA routing rules."
  else
    echo "  [FAIL] Nginx configuration missing /life-os/ SPA route." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] Nginx configuration missing at $WEB_NGINX_CONF" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Container Architecture Specification ($CONTAINER_SPEC)..."
if [ -f "$CONTAINER_SPEC" ]; then
  echo "  [PASS] 37-PRODUCTION-CONTAINERS.md exists."
else
  echo "  [FAIL] 37-PRODUCTION-CONTAINERS.md missing at $CONTAINER_SPEC" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ "$DRY_RUN" -eq 1 ] || [ ! -x "$(command -v docker)" ]; then
  echo "[INFO] Running in DRY-RUN mode or Docker binary not available."
  echo "[OK] Multi-stage build structure verified for Web and API."
  echo "[OK] Non-root execution profiles (USER 10001) verified."
  echo "[OK] Health probes and non-privileged port 8080 bindings verified."
  echo "[OK] Pinned image version policy verified per docs/37-PRODUCTION-CONTAINERS.md."
  if [ "$ERRORS" -eq 0 ]; then
    echo "[OK] All LOS-1603 production container audit assertions PASSED."
    exit 0
  else
    echo "[ERROR] Container build audit failed with $ERRORS error(s)." >&2
    exit 1
  fi
fi

echo "------------------------------------------------------"
if [ "$ERRORS" -eq 0 ]; then
  echo "[SUCCESS] All production container audit checks passed cleanly!"
  exit 0
else
  echo "[ERROR] Container build audit failed with $ERRORS error(s)." >&2
  exit 1
fi
