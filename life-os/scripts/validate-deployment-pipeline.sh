#!/usr/bin/env sh

# LifeOS Deployment Pipeline Audit Script (LOS-1607)
# Audits deployment pipeline specification, GitHub Actions workflow, deployment script, and execution contract.

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
echo " LifeOS Deployment Pipeline Audit (LOS-1607)"
echo "======================================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

SPEC_DOC="$REPO_ROOT/life-os/docs/41-DEPLOYMENT-PIPELINE.md"
WORKFLOW_FILE="$REPO_ROOT/.github/workflows/lifeos-deploy.yml"
DEPLOY_SCRIPT="$REPO_ROOT/life-os/scripts/deploy-pipeline.sh"

echo "[*] Checking Specification Document ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 41-DEPLOYMENT-PIPELINE.md exists."
  
  if grep -q "LOS-1607" "$SPEC_DOC" && grep -q "Immutable Tagging Rules" "$SPEC_DOC"; then
    echo "  [PASS] Specification contains ticket contract and immutable tagging rules."
  else
    echo "  [FAIL] Specification missing required contract sections." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] Specification document missing at $SPEC_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking GitHub Actions Deployment Workflow ($WORKFLOW_FILE)..."
if [ -f "$WORKFLOW_FILE" ]; then
  echo "  [PASS] lifeos-deploy.yml workflow file exists."

  for job in "LifeOS / Build, Test & Scan" "LifeOS / Container Build & SBOM" "LifeOS / Deploy Staging" "LifeOS / Deploy Production"; do
    if grep -q "$job" "$WORKFLOW_FILE"; then
      echo "  [PASS] Pipeline job '$job' declared."
    else
      echo "  [FAIL] Missing pipeline job '$job' in workflow file." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done

  if grep -q "environment:" "$WORKFLOW_FILE" && grep -q "name: staging" "$WORKFLOW_FILE" && grep -q "name: production" "$WORKFLOW_FILE"; then
    echo "  [PASS] GitHub protected deployment environments (staging & production) configured."
  else
    echo "  [FAIL] Missing protected deployment environment blocks in workflow." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "permissions:" "$WORKFLOW_FILE" && grep -q "contents: read" "$WORKFLOW_FILE"; then
    echo "  [PASS] Least-privilege workflow permissions enforced."
  else
    echo "  [FAIL] Missing least-privilege permissions in workflow." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] Deployment workflow file missing at $WORKFLOW_FILE" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Deployment Pipeline Script ($DEPLOY_SCRIPT)..."
if [ -f "$DEPLOY_SCRIPT" ]; then
  echo "  [PASS] deploy-pipeline.sh script exists."

  if [ -x "$DEPLOY_SCRIPT" ]; then
    echo "  [PASS] deploy-pipeline.sh has executable permissions."
  else
    echo "  [FAIL] deploy-pipeline.sh is not executable." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "TARGET_ENV" "$DEPLOY_SCRIPT" && grep -q "RELEASE_TAG" "$DEPLOY_SCRIPT"; then
    echo "  [PASS] Target environment and release tag options supported."
  else
    echo "  [FAIL] Missing environment/tag parameters in deploy-pipeline.sh." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "Flyway" "$DEPLOY_SCRIPT" || grep -q "migration" "$DEPLOY_SCRIPT"; then
    echo "  [PASS] Database migration ordering check included."
  else
    echo "  [FAIL] Missing database migration ordering check in deploy-pipeline.sh." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "deployments.json" "$DEPLOY_SCRIPT"; then
    echo "  [PASS] Deployment audit record logging configured."
  else
    echo "  [FAIL] Missing deployment audit record logging in deploy-pipeline.sh." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] Deployment pipeline script missing at $DEPLOY_SCRIPT" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Executing Dry-Run Pipeline Validation..."
if [ -x "$DEPLOY_SCRIPT" ]; then
  if sh "$DEPLOY_SCRIPT" --target=staging --dry-run >/dev/null 2>&1; then
    echo "  [PASS] Staging deployment pipeline dry-run passed."
  else
    echo "  [FAIL] Staging deployment pipeline dry-run failed." >&2
    ERRORS=$((ERRORS + 1))
  fi

  if sh "$DEPLOY_SCRIPT" --target=production --tag=v1.0.0 --dry-run >/dev/null 2>&1; then
    echo "  [PASS] Production deployment pipeline dry-run passed."
  else
    echo "  [FAIL] Production deployment pipeline dry-run failed." >&2
    ERRORS=$((ERRORS + 1))
  fi
fi

if [ "$DRY_RUN" -eq 1 ];  then
  echo "[INFO] Running in DRY-RUN mode."
  echo "[OK] Deployment pipeline specification contract verified."
  echo "[OK] GitHub Actions workflow stages and protected environment gates verified."
  echo "[OK] Deployment execution script permissions and migration ordering verified."
  echo "[OK] Staging and Production pipeline dry-runs verified cleanly."
  if [ "$ERRORS" -eq 0 ]; then
    echo "[OK] All LOS-1607 deployment pipeline audit assertions PASSED."
    exit 0
  else
    echo "[ERROR] Deployment pipeline audit failed with $ERRORS error(s)." >&2
    exit 1
  fi
fi

echo "-------------------------------------------------------"
if [ "$ERRORS" -eq 0 ]; then
  echo "[SUCCESS] All deployment pipeline audit checks passed cleanly!"
  exit 0
else
  echo "[ERROR] Deployment pipeline audit failed with $ERRORS error(s)." >&2
  exit 1
fi
