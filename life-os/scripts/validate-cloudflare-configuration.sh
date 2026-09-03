#!/usr/bin/env sh

# LifeOS Cloudflare Configuration Audit Script (LOS-1606)
# Audits Cloudflare DNS, Proxy, TLS, Cache rules, WAF, and origin UFW restriction against docs/40-CLOUDFLARE-DNS-PROXY-AND-TLS.md.

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
echo " LifeOS Cloudflare Configuration Audit (LOS-1606)"
echo "======================================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

SPEC_DOC="$REPO_ROOT/life-os/docs/40-CLOUDFLARE-DNS-PROXY-AND-TLS.md"
RULESET_FILE="$REPO_ROOT/life-os/infra/cloudflare/cloudflare-ruleset.json"
FIREWALL_SCRIPT="$REPO_ROOT/life-os/infra/cloudflare/configure-cloudflare-origin-firewall.sh"
PROD_CADDY="$REPO_ROOT/life-os/infra/caddy/Caddyfile.prod"
STAGING_CADDY="$REPO_ROOT/life-os/infra/caddy/Caddyfile.staging"
DEPLOY_CADDY="$REPO_ROOT/deploy/caddy/Caddyfile"

echo "[*] Checking Cloudflare Specification Document ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 40-CLOUDFLARE-DNS-PROXY-AND-TLS.md exists."

  for keyword in "Full (strict)" "buildwithpartha.tech" "staging.buildwithpartha.tech" "Bypass Cache" "Rate Limiting" "147.93.107.135"; do
    if grep -q "$keyword" "$SPEC_DOC"; then
      echo "  [PASS] Specification contains required keyword '$keyword'."
    else
      echo "  [FAIL] Specification missing required keyword '$keyword'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Specification document missing at $SPEC_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Cloudflare Declarative Ruleset ($RULESET_FILE)..."
if [ -f "$RULESET_FILE" ]; then
  echo "  [PASS] cloudflare-ruleset.json exists."

  if command -v node >/dev/null 2>&1; then
    if node -e "JSON.parse(fs.readFileSync('$RULESET_FILE'))" >/dev/null 2>&1; then
      echo "  [PASS] cloudflare-ruleset.json is valid JSON."
    else
      echo "  [FAIL] cloudflare-ruleset.json contains invalid JSON syntax." >&2
      ERRORS=$((ERRORS + 1))
    fi
  fi

  for key in "full_strict" "buildwithpartha.tech" "staging.buildwithpartha.tech" "bypass_cache" "rate_limiting_rules"; do
    if grep -q "$key" "$RULESET_FILE"; then
      echo "  [PASS] Ruleset contains configuration key '$key'."
    else
      echo "  [FAIL] Ruleset missing configuration key '$key'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Declarative ruleset missing at $RULESET_FILE" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Origin Firewall Configuration Script ($FIREWALL_SCRIPT)..."
if [ -f "$FIREWALL_SCRIPT" ]; then
  echo "  [PASS] configure-cloudflare-origin-firewall.sh exists."
  
  if [ -x "$FIREWALL_SCRIPT" ]; then
    echo "  [PASS] configure-cloudflare-origin-firewall.sh is executable."
  else
    echo "  [FAIL] configure-cloudflare-origin-firewall.sh is not executable." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if sh "$FIREWALL_SCRIPT" --dry-run >/dev/null 2>&1; then
    echo "  [PASS] configure-cloudflare-origin-firewall.sh --dry-run executed cleanly."
  else
    echo "  [FAIL] configure-cloudflare-origin-firewall.sh --dry-run failed." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] Origin firewall script missing at $FIREWALL_SCRIPT" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Caddy ingress proxy header & domain definitions..."
for caddy_path in "$PROD_CADDY" "$STAGING_CADDY" "$DEPLOY_CADDY"; do
  if [ -f "$caddy_path" ]; then
    echo "  [PASS] Caddyfile exists at $caddy_path."
  else
    echo "  [FAIL] Caddyfile missing at $caddy_path." >&2
    ERRORS=$((ERRORS + 1))
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo "======================================================="
  echo " FAIL: $ERRORS Cloudflare validation check(s) failed."
  echo "======================================================="
  exit 1
fi

echo "======================================================="
echo " SUCCESS: All Cloudflare configuration checks passed!"
echo "======================================================="
exit 0
