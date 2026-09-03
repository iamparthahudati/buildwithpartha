#!/usr/bin/env sh

# LifeOS Application Data & File Backup Audit Script (LOS-1609)
# Audits backup/restore specification, executable scripts, encryption parameters, retention rules, and dry-run execution.

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
echo " LifeOS Application Data File Backup Audit (LOS-1609)"
echo "======================================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

SPEC_DOC="$REPO_ROOT/life-os/docs/43-APPLICATION-DATA-AND-FILE-BACKUP.md"
BACKUP_SCRIPT="$REPO_ROOT/life-os/scripts/backup-app-files.sh"
RESTORE_SCRIPT="$REPO_ROOT/life-os/scripts/restore-app-files-backup.sh"

echo "[*] Checking Specification Document ($SPEC_DOC)..."
if [ -f "$SPEC_DOC" ]; then
  echo "  [PASS] 43-APPLICATION-DATA-AND-FILE-BACKUP.md exists."
  
  for term in "LOS-1609" "AES256" "RPO" "RTO" "35" "attachments" "app-files-backup-status.json"; do
    if grep -q "$term" "$SPEC_DOC"; then
      echo "  [PASS] Specification contains term '$term'."
    else
      echo "  [FAIL] Specification missing required term '$term'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Specification document missing at $SPEC_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Automated Backup Script ($BACKUP_SCRIPT)..."
if [ -f "$BACKUP_SCRIPT" ]; then
  echo "  [PASS] backup-app-files.sh exists."
  
  if [ -x "$BACKUP_SCRIPT" ]; then
    echo "  [PASS] backup-app-files.sh is executable."
  else
    echo "  [FAIL] backup-app-files.sh is not executable." >&2
    ERRORS=$((ERRORS + 1))
  fi

  for pattern in "tar" "AES256" "BACKUP_ENCRYPTION_PASSPHRASE" "KEEP_DAYS" "--dry-run"; do
    if grep -q -- "$pattern" "$BACKUP_SCRIPT"; then
      echo "  [PASS] backup-app-files.sh contains pattern '$pattern'."
    else
      echo "  [FAIL] backup-app-files.sh missing required pattern '$pattern'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Backup script missing at $BACKUP_SCRIPT" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Checking Automated Restore Script ($RESTORE_SCRIPT)..."
if [ -f "$RESTORE_SCRIPT" ]; then
  echo "  [PASS] restore-app-files-backup.sh exists."
  
  if [ -x "$RESTORE_SCRIPT" ]; then
    echo "  [PASS] restore-app-files-backup.sh is executable."
  else
    echo "  [FAIL] restore-app-files-backup.sh is not executable." >&2
    ERRORS=$((ERRORS + 1))
  fi

  for pattern in "tar" "gpg --decrypt" "BACKUP_ENCRYPTION_PASSPHRASE" "reconciliation" "--dry-run"; do
    if grep -q -- "$pattern" "$RESTORE_SCRIPT"; then
      echo "  [PASS] restore-app-files-backup.sh contains pattern '$pattern'."
    else
      echo "  [FAIL] restore-app-files-backup.sh missing required pattern '$pattern'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Restore script missing at $RESTORE_SCRIPT" >&2
  ERRORS=$((ERRORS + 1))
fi

echo "[*] Testing Dry-Run Script Executions..."
if [ -x "$BACKUP_SCRIPT" ]; then
  if "$BACKUP_SCRIPT" --dry-run >/dev/null 2>&1; then
    echo "  [PASS] backup-app-files.sh --dry-run executed successfully."
  else
    echo "  [FAIL] backup-app-files.sh --dry-run failed." >&2
    ERRORS=$((ERRORS + 1))
  fi
fi

if [ -x "$RESTORE_SCRIPT" ]; then
  if "$RESTORE_SCRIPT" --dry-run >/dev/null 2>&1; then
    echo "  [PASS] restore-app-files-backup.sh --dry-run executed successfully."
  else
    echo "  [FAIL] restore-app-files-backup.sh --dry-run failed." >&2
    ERRORS=$((ERRORS + 1))
  fi
fi

echo "======================================================="
if [ "$ERRORS" -eq 0 ]; then
  echo " [SUCCESS] Application data file backup & restore validation passed with 0 errors."
  exit 0
else
  echo " [FAILURE] Audit completed with $ERRORS error(s)." >&2
  exit 1
fi
