#!/usr/bin/env sh

# LifeOS Security Headers and CSP Audit Script (LOS-1507)
# Audits Caddy, Nginx, and Spring Boot API configurations against docs/51-SECURITY-HEADERS-AND-CSP.md.

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
echo " LifeOS Security Headers & CSP Audit (LOS-1507)"
echo "======================================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

SPEC_DOC="$REPO_ROOT/life-os/docs/51-SECURITY-HEADERS-AND-CSP.md"
PROD_CADDY="$REPO_ROOT/life-os/infra/caddy/Caddyfile.prod"
STAGING_CADDY="$REPO_ROOT/life-os/infra/caddy/Caddyfile.staging"
DEPLOY_CADDY="$REPO_ROOT/deploy/caddy/Caddyfile"
NGINX_CONF="$REPO_ROOT/life-os/apps/web/nginx.conf"
API_SECURITY="$REPO_ROOT/life-os/apps/api/src/main/java/tech/buildwithpartha/lifeos/config/ApiSecurityConfiguration.java"
API_TEST="$REPO_ROOT/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/SecurityHeadersIntegrationTests.java"
E2E_SPEC="$REPO_ROOT/life-os/apps/web/e2e/security/security-headers.spec.ts"

echo "[*] Checking Specification Document ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 51-SECURITY-HEADERS-AND-CSP.md exists."
  for keyword in "Content-Security-Policy" "Strict-Transport-Security" "X-Frame-Options" "Permissions-Policy" "Referrer-Policy" "Cross-Origin-Opener-Policy" "Cross-Origin-Resource-Policy"; do
    if grep -q "$keyword" "$SPEC_DOC"; then
      echo "  [PASS] Specification document contains '$keyword'."
    else
      echo "  [FAIL] Specification document missing '$keyword'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Specification document missing at $SPEC_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Production Caddyfile ($PROD_CADDY)..."
if [ -f "$PROD_CADDY" ]; then
  echo "  [PASS] Caddyfile.prod exists."
  for directive in \
    "Strict-Transport-Security" \
    "X-Content-Type-Options \"nosniff\"" \
    "Referrer-Policy \"strict-origin-when-cross-origin\"" \
    "X-Frame-Options \"DENY\"" \
    "Permissions-Policy" \
    "X-XSS-Protection \"0\"" \
    "Cross-Origin-Opener-Policy \"same-origin\"" \
    "Cross-Origin-Resource-Policy \"same-origin\"" \
    "Content-Security-Policy"; do
    if grep -q "$directive" "$PROD_CADDY"; then
      echo "  [PASS] Caddyfile.prod enforces $directive."
    else
      echo "  [FAIL] Caddyfile.prod missing $directive." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done

  # Verify script-src does not have unsafe broad exceptions
  if grep "Content-Security-Policy" "$PROD_CADDY" | grep -q "script-src 'self';"; then
    echo "  [PASS] Caddyfile.prod CSP script-src does not allow unsafe-inline/unsafe-eval."
  else
    echo "  [FAIL] Caddyfile.prod CSP script-src contains unsafe broad exceptions." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] Caddyfile.prod missing at $PROD_CADDY" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Staging Caddyfile ($STAGING_CADDY)..."
if [ -f "$STAGING_CADDY" ]; then
  echo "  [PASS] Caddyfile.staging exists."
  for directive in \
    "Strict-Transport-Security" \
    "X-Content-Type-Options \"nosniff\"" \
    "Referrer-Policy \"strict-origin-when-cross-origin\"" \
    "X-Frame-Options \"DENY\"" \
    "Permissions-Policy" \
    "Content-Security-Policy" \
    "X-Robots-Tag"; do
    if grep -q "$directive" "$STAGING_CADDY"; then
      echo "  [PASS] Caddyfile.staging enforces $directive."
    else
      echo "  [FAIL] Caddyfile.staging missing $directive." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Caddyfile.staging missing at $STAGING_CADDY" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Deploy Caddyfile ($DEPLOY_CADDY)..."
if [ -f "$DEPLOY_CADDY" ]; then
  echo "  [PASS] deploy/caddy/Caddyfile exists."
  if grep -q "X-Frame-Options \"DENY\"" "$DEPLOY_CADDY" && grep -q "Permissions-Policy" "$DEPLOY_CADDY"; then
    echo "  [PASS] deploy/caddy/Caddyfile synchronized with hardened security headers."
  else
    echo "  [FAIL] deploy/caddy/Caddyfile missing hardened security headers." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] deploy/caddy/Caddyfile missing at $DEPLOY_CADDY" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Frontend Nginx Configuration ($NGINX_CONF)..."
if [ -f "$NGINX_CONF" ]; then
  echo "  [PASS] nginx.conf exists."
  for directive in \
    "X-Content-Type-Options \"nosniff\"" \
    "X-Frame-Options \"DENY\"" \
    "X-XSS-Protection \"0\"" \
    "Referrer-Policy \"strict-origin-when-cross-origin\"" \
    "Permissions-Policy" \
    "Cross-Origin-Opener-Policy \"same-origin\"" \
    "Cross-Origin-Resource-Policy \"same-origin\"" \
    "Content-Security-Policy"; do
    if grep -q "$directive" "$NGINX_CONF"; then
      echo "  [PASS] nginx.conf enforces $directive."
    else
      echo "  [FAIL] nginx.conf missing $directive." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] nginx.conf missing at $NGINX_CONF" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Spring Boot API Security Configuration ($API_SECURITY)..."
if [ -f "$API_SECURITY" ]; then
  echo "  [PASS] ApiSecurityConfiguration.java exists."
  for rule in \
    "contentTypeOptions" \
    "FrameOptionsConfig" \
    "httpStrictTransportSecurity" \
    "ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN" \
    "Permissions-Policy" \
    "contentSecurityPolicy" \
    "Cross-Origin-Opener-Policy" \
    "Cross-Origin-Resource-Policy"; do
    if grep -q "$rule" "$API_SECURITY"; then
      echo "  [PASS] ApiSecurityConfiguration.java configures $rule."
    else
      echo "  [FAIL] ApiSecurityConfiguration.java missing $rule." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] ApiSecurityConfiguration.java missing at $API_SECURITY" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Automated Test Suites..."
if [ -f "$API_TEST" ]; then
  echo "  [PASS] Backend SecurityHeadersIntegrationTests.java exists."
else
  echo "  [FAIL] Backend test suite missing at $API_TEST" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ -f "$E2E_SPEC" ]; then
  echo "  [PASS] Frontend E2E security-headers.spec.ts exists."
else
  echo "  [FAIL] Frontend E2E test suite missing at $E2E_SPEC" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "-------------------------------------------------------"
if [ "$ERRORS" -eq 0 ]; then
  echo "[SUCCESS] All security headers and CSP checks passed cleanly!"
  exit 0
else
  echo "[ERROR] Security headers audit failed with $ERRORS error(s)." >&2
  exit 1
fi
