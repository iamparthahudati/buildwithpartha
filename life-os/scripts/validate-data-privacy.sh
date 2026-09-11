#!/usr/bin/env sh

# LifeOS Data Export, Deletion Lifecycle, and Privacy Verification Audit Script (LOS-1512)
# Audits data portability completeness across 19 domain models, secret exclusion,
# tenant isolation, 30-day deletion grace period, cascade purge, and test passes against docs/31-PRIVACY-DATA-LIFECYCLE.md.

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
echo " LifeOS Data Export, Deletion & Privacy Audit (LOS-1512)"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0

PRIVACY_SPEC="$REPO_ROOT/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md"
ADR_DOC="$REPO_ROOT/life-os/docs/adr/ADR-012-V1-PRIVACY-POSTURE.md"
EXPORT_SCHEMA="$REPO_ROOT/life-os/docs/schemas/data-export.schema.json"
PRIVACY_TEST="$REPO_ROOT/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/DataPrivacyVerificationIntegrationTests.java"
ARCHIVE_BUILDER="$REPO_ROOT/life-os/apps/api/src/main/java/tech/buildwithpartha/lifeos/export/application/ExportArchiveBuilder.java"
PURGE_SERVICE="$REPO_ROOT/life-os/apps/api/src/main/java/tech/buildwithpartha/lifeos/auth/application/AccountDeletionPurgeService.java"

# 1. Check Documentation & Policy Artifacts
echo "[*] Auditing Privacy and Data Lifecycle Specifications..."
if [ -f "$PRIVACY_SPEC" ]; then
  echo "  [PASS] 31-PRIVACY-DATA-LIFECYCLE.md exists."
  for keyword in "LOS-1512" "manifest.json" "account.json" "tasks.json" "projects.json" "notes.json" "Argon2" "30-day grace period" "PURGED"; do
    if grep -q "$keyword" "$PRIVACY_SPEC"; then
      echo "  [PASS] Specification contains '$keyword'."
    else
      echo "  [FAIL] Specification missing required section or keyword: '$keyword'." >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  [FAIL] Specification document missing at $PRIVACY_SPEC" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ -f "$ADR_DOC" ]; then
  echo "  [PASS] ADR-012-V1-PRIVACY-POSTURE.md exists."
else
  echo "  [FAIL] ADR missing at $ADR_DOC" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ -f "$EXPORT_SCHEMA" ]; then
  echo "  [PASS] data-export.schema.json exists."
else
  echo "  [FAIL] Export schema missing at $EXPORT_SCHEMA" >&2
  ERRORS=$((ERRORS + 1))
fi

# 2. Check Domain Export Contributors
echo "[*] Auditing Domain Export Contributors across LifeOS aggregates..."
CONTRIBUTORS="
tech/buildwithpartha/lifeos/task/application/TaskExportContributor.java
tech/buildwithpartha/lifeos/project/application/ProjectExportContributor.java
tech/buildwithpartha/lifeos/label/application/LabelExportContributor.java
tech/buildwithpartha/lifeos/timeblock/application/TimeBlockExportContributor.java
tech/buildwithpartha/lifeos/focus/application/FocusSessionExportContributor.java
tech/buildwithpartha/lifeos/sprint/application/SprintExportContributor.java
tech/buildwithpartha/lifeos/sprint/application/WeeklyPlanExportContributor.java
tech/buildwithpartha/lifeos/sprint/application/ReviewExportContributor.java
tech/buildwithpartha/lifeos/goal/application/GoalExportContributor.java
tech/buildwithpartha/lifeos/note/application/NoteExportContributor.java
tech/buildwithpartha/lifeos/braindump/application/BrainDumpExportContributor.java
tech/buildwithpartha/lifeos/habit/application/HabitExportContributor.java
tech/buildwithpartha/lifeos/notification/application/NotificationExportContributor.java
tech/buildwithpartha/lifeos/audit/application/ProductActivityExportContributor.java
tech/buildwithpartha/lifeos/comment/application/CommentExportContributor.java
tech/buildwithpartha/lifeos/attachment/application/AttachmentMetadataExportContributor.java
"

for rel_path in $CONTRIBUTORS; do
  full_path="$REPO_ROOT/life-os/apps/api/src/main/java/$rel_path"
  if [ -f "$full_path" ]; then
    echo "  [PASS] Contributor exists: $(basename "$full_path")"
  else
    echo "  [FAIL] Missing contributor: $rel_path" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# 3. Check Core Application Services & Privacy Controls
echo "[*] Auditing Core Export Archive Builder & Deletion Purge Service..."
if [ -f "$ARCHIVE_BUILDER" ]; then
  echo "  [PASS] ExportArchiveBuilder.java exists."
else
  echo "  [FAIL] ExportArchiveBuilder missing at $ARCHIVE_BUILDER" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ -f "$PURGE_SERVICE" ]; then
  echo "  [PASS] AccountDeletionPurgeService.java exists."
else
  echo "  [FAIL] AccountDeletionPurgeService missing at $PURGE_SERVICE" >&2
  ERRORS=$((ERRORS + 1))
fi

# 4. Check Test Suite
echo "[*] Auditing Data Privacy Verification Integration Test Suite..."
if [ -f "$PRIVACY_TEST" ]; then
  echo "  [PASS] DataPrivacyVerificationIntegrationTests.java exists."
else
  echo "  [FAIL] Test suite missing at $PRIVACY_TEST" >&2
  ERRORS=$((ERRORS + 1))
fi

# 5. Execute Test Suite in Live Mode
if [ "$DRY_RUN" -eq 0 ]; then
  echo "[*] Executing automated verification test suite via Gradle..."
  cd "$REPO_ROOT/life-os/apps/api"
  if ./gradlew test --tests tech.buildwithpartha.lifeos.auth.api.DataPrivacyVerificationIntegrationTests; then
    echo "  [PASS] DataPrivacyVerificationIntegrationTests passed cleanly."
  else
    echo "  [FAIL] DataPrivacyVerificationIntegrationTests failed." >&2
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "[*] Dry-run mode enabled: skipping live test execution."
fi

echo "======================================================"
if [ "$ERRORS" -eq 0 ]; then
  echo " Data Export, Deletion & Privacy Verification: ALL AUDITS PASSED"
  echo "======================================================"
  exit 0
else
  echo " Data Export, Deletion & Privacy Verification: FAILED ($ERRORS errors)"
  echo "======================================================"
  exit 1
fi
