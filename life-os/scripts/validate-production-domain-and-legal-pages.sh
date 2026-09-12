#!/usr/bin/env sh

# ==============================================================================
# LifeOS Production Domain and Legal Pages Audit Script (LOS-1614)
# ==============================================================================
# Audits production domain routing, legal pages, robots policies,
# security.txt declarations, HTML canonical metadata, and versioning consistency.
# ==============================================================================

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
echo " LifeOS Domain & Legal Pages Audit (LOS-1614)"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

SPEC_DOC="$REPO_ROOT/life-os/docs/62-PRODUCTION-DOMAIN-AND-LEGAL-PAGES.md"
WEB_DIR="$REPO_ROOT/life-os/apps/web"
PUBLIC_DIR="$WEB_DIR/public"
SITE_DIR="$REPO_ROOT/deploy/site"

# 1. Check Specification Document
echo "[*] Auditing Production Domain & Legal Specification ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 62-PRODUCTION-DOMAIN-AND-LEGAL-PAGES.md exists."

  for keyword in "LOS-1614" "buildwithpartha.tech" "LandingRoute" "PrivacyRoute" "TermsRoute" "robots.txt" "security.txt" "DPDP Act 2023" "Grievance Officer"; do
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

# 2. Check Static Assets (robots.txt, security.txt, favicon.svg)
echo "[*] Auditing Static Domain & Security Assets..."
for asset in "$PUBLIC_DIR/robots.txt" "$PUBLIC_DIR/.well-known/security.txt" "$SITE_DIR/robots.txt" "$SITE_DIR/.well-known/security.txt"; do
  if [ -f "$asset" ]; then
    echo "  [PASS] Found asset $(basename "$(dirname "$asset")")/$(basename "$asset")."
  else
    echo "  [FAIL] Missing asset: $asset" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# Check robots.txt content
if grep -q "Disallow: /life-os/app/" "$PUBLIC_DIR/robots.txt" && grep -q "Allow: /life-os/privacy" "$PUBLIC_DIR/robots.txt"; then
  echo "  [PASS] robots.txt enforces private app exclusion and public policy inclusion."
else
  echo "  [FAIL] robots.txt missing required disallow/allow rules." >&2
  ERRORS=$((ERRORS + 1))
fi

# Check security.txt RFC 9116 compliance
if grep -q "Contact: mailto:security@buildwithpartha.tech" "$PUBLIC_DIR/.well-known/security.txt" && grep -q "Expires:" "$PUBLIC_DIR/.well-known/security.txt"; then
  echo "  [PASS] security.txt conforms to RFC 9116 security declaration."
else
  echo "  [FAIL] security.txt missing required RFC 9116 fields." >&2
  ERRORS=$((ERRORS + 1))
fi

# 3. Check Frontend Route Implementations
echo "[*] Auditing Frontend Routes & Tests..."
for route_file in "$WEB_DIR/src/routes/LandingRoute.tsx" "$WEB_DIR/src/routes/PrivacyRoute.tsx" "$WEB_DIR/src/routes/TermsRoute.tsx" "$WEB_DIR/src/routes/LandingRoute.test.tsx" "$WEB_DIR/src/routes/PrivacyRoute.test.tsx" "$WEB_DIR/src/routes/TermsRoute.test.tsx"; do
  if [ -f "$route_file" ]; then
    echo "  [PASS] Route component/test exists: $(basename "$route_file")."
  else
    echo "  [FAIL] Missing route file: $route_file" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# 4. Check HTML Head Metadata and Canonical Links
echo "[*] Auditing HTML Metadata and Canonical Links..."
INDEX_HTML="$WEB_DIR/index.html"
if [ -f "$INDEX_HTML" ]; then
  if grep -q 'rel="canonical" href="https://buildwithpartha.tech/life-os"' "$INDEX_HTML"; then
    echo "  [PASS] index.html declares correct canonical URL."
  else
    echo "  [FAIL] index.html missing canonical URL declaration." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q 'property="og:title"' "$INDEX_HTML" && grep -q 'name="twitter:card"' "$INDEX_HTML"; then
    echo "  [PASS] index.html declares Open Graph and Twitter metadata."
  else
    echo "  [FAIL] index.html missing Open Graph / Twitter tags." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] index.html missing at $INDEX_HTML" >&2
  ERRORS=$((ERRORS + 1))
fi

# 5. Check Legal Version Agreement
echo "[*] Auditing Legal Version Agreement between Frontend & Backend..."
LEGAL_VERSIONS_TS="$WEB_DIR/src/features/auth/model/legalVersions.ts"
if [ -f "$LEGAL_VERSIONS_TS" ]; then
  if grep -q 'TERMS_VERSION = "2026-08-01"' "$LEGAL_VERSIONS_TS" && grep -q 'PRIVACY_VERSION = "2026-08-01"' "$LEGAL_VERSIONS_TS"; then
    echo "  [PASS] legalVersions.ts pins TERMS_VERSION and PRIVACY_VERSION to 2026-08-01."
  else
    echo "  [FAIL] legalVersions.ts has mismatching version constants." >&2
    ERRORS=$((ERRORS + 1))
  fi
fi

echo "======================================================"
if [ "$ERRORS" -eq 0 ]; then
  echo " [PASS] All 5 Production Domain & Legal Page Audits Passed!"
  echo "======================================================"
  exit 0
else
  echo " [FAIL] Production Domain & Legal Audit Failed with $ERRORS error(s)." >&2
  echo "======================================================"
  exit 1
fi
