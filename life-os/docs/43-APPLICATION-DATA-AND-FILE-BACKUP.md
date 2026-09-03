# LifeOS application data and file backup specification

- Status: Accepted
- Date: 2026-09-03
- Ticket: [LOS-1609](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-1310](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-13-PLATFORM-FEATURES.md), [LOS-1608](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/42-POSTGRESQL-BACKUP-AND-RESTORE.md), [LOS-1602](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md), [LOS-0113](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md), [ADR-012](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-012-V1-PRIVACY-POSTURE.md), [ADR-015](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-015-ATTACHMENT-STORAGE-AND-QUOTAS.md)

---

## 1. Executive summary & architectural scope

This specification defines the canonical application data and file backup architecture, persistent versus transient data categorization, AES-256 encryption standards, off-VPS transmission patterns, retention and expiry schedules, database-file consistency and restore ordering protocols, post-restoration orphan reconciliation, failure monitoring and alerting hooks, recovery runbooks, and non-logging security rules for LifeOS across production (`buildwithpartha.tech`) and staging (`staging.buildwithpartha.tech`).

In accordance with [docs/31-PRIVACY-DATA-LIFECYCLE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md), [docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md), [docs/42-POSTGRESQL-BACKUP-AND-RESTORE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/42-POSTGRESQL-BACKUP-AND-RESTORE.md), and [docs/adr/ADR-015-ATTACHMENT-STORAGE-AND-QUOTAS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-015-ATTACHMENT-STORAGE-AND-QUOTAS.md), the file backup framework guarantees zero unencrypted data exposure, deterministic recovery, database-file relational integrity, and strict privacy retention compliance.

This document establishes the application file backup execution script (`life-os/scripts/backup-app-files.sh`), restore execution script (`life-os/scripts/restore-app-files-backup.sh`), and automated compliance verification audit script (`life-os/scripts/validate-app-files-backups.sh`).

---

## 2. Persistent vs. transient data taxonomy

LifeOS explicitly partitions application storage resources into **Persistent Data** (subject to automated nightly backups) and **Transient Data** (excluded from backups to optimize storage efficiency, execution speed, and security):

| Data Category | Target Location / Storage Mechanism | Included in Backup? | Description & Lifecycle Governance |
| --- | --- | --- | --- |
| **User Attachments** | `/var/lib/life-os/attachments` (or `APP_ATTACHMENT_STORAGE_PATH`) | **YES (Persistent)** | Private user uploaded task and project binary files (`public.attachments` table metadata references). High durability requirement. |
| **User Data Exports** | `/var/lib/life-os/exports` (or `APP_EXPORT_STORAGE_PATH`) | **YES (Persistent)** | Generated export archive binaries (`public.export_files` table metadata references). Preserved until user download or 7-day retention expiry. |
| **Object Storage Payloads** | S3 / MinIO buckets (`attachments/{userId}/{attachmentId}`) | **YES (Persistent)** | S3-compatible private object storage payloads when remote storage adapter is enabled. |
| **Upload Scratch Files** | `/tmp/lifeos-attachments`, `/tmp/life-os-uploads` | **NO (Transient)** | Temporary multipart file upload chunks pending virus scan or finalization. Automatically purged on process exit. |
| **Export Build Buffers** | `/tmp/lifeos-exports`, `/tmp/export-scratch-*` | **NO (Transient)** | Temporary ZIP/CSV assembly directories during export packaging. Wiped upon export completion. |
| **Application Logs** | `/var/log/life-os/*.log`, systemd journald logs | **NO (Transient)** | Rolling operational log files. Excluded from file backups; managed via log rotation and centralized safe log collectors (LOS-1611). |
| **Search & Cache Buffers** | `/tmp/lifeos-cache`, Lucene/in-memory indices | **NO (Transient)** | Ephemeral cache entries and search index files. Rebuildable dynamically from PostgreSQL database. |

---

## 3. Recovery objectives & schedule

| Metric | Target / Specification | Description |
| --- | --- | --- |
| **RPO (Recovery Point Objective)** | **24 Hours** | Automated nightly application file backups executed at 02:30 UTC (30 minutes after PostgreSQL database backup at 02:00 UTC). |
| **RTO (Recovery Time Objective)** | **< 15 Minutes** | Full archive decryption, integrity verification, extraction into application file volumes, and DB orphan reconciliation. |
| **Backup Window** | **02:30 - 02:45 UTC** | Executes following database backup completion, capturing file state during low-traffic window. |
| **Archive Format** | **Compressed Tar (`tar.gz`)** | Standard POSIX gzipped tarball preserving file ownership, permissions (`0600`/`0700`), and nested directory hierarchies. |

---

## 4. Cryptographic encryption & secret security

1. **AES-256 Symmetric Encryption**:
   - Every application file backup archive is encrypted immediately upon generation using GnuPG:
     `gpg --symmetric --cipher-algo AES256 --batch --yes --passphrase-fd 0`
   - Unencrypted tar archives (`.tar.gz`) are assembled in isolated, restricted scratch directories (`/tmp/lifeos-app-backup-*`) with strict permissions (`0700` / `0600`) and deleted immediately after encryption.

2. **Passphrase Derivation & Vault Storage**:
   - Encryption key is supplied via `BACKUP_ENCRYPTION_PASSPHRASE` environment variable.
   - Master passphrase standards require minimum 256-bit entropy (32+ random alphanumeric/symbolic characters).
   - Master passphrases are stored strictly **out-of-band** in encrypted password vaults (e.g. Bitwarden / 1Password) with 2FA protection.

3. **Strict Non-Logging Contract**:
   - Scripts and process pipes MUST NEVER print, log, echo, or expose `BACKUP_ENCRYPTION_PASSPHRASE`, storage secrets, or connection URIs in stdout, stderr, process lists, or log files.
   - Command invocations feed passphrases via standard input or subshell file descriptors (`--passphrase-fd 0`), preventing exposure in `ps aux` command-line arguments.

---

## 5. Backup artifact structure & metadata schema

Application data file backup outputs consist of three linked files stored in the host backup directory (`/var/backups/life-os/app-files`):

```
/var/backups/life-os/app-files/
├── lifeos-app-files-backup-20260903-023000.tar.gz.gpg   # Encrypted AES-256 binary file archive
├── lifeos-app-files-backup-20260903-023000.sha256       # SHA-256 checksum file
└── lifeos-app-files-backup-20260903-023000.json         # Structured metadata manifest
```

### JSON Metadata Manifest Schema (`<backup>.json`)

```json
{
  "backupId": "lifeos-app-files-backup-20260903-023000",
  "timestamp": "2026-09-03T02:30:00Z",
  "environment": "production",
  "attachmentStoragePath": "/var/lib/life-os/attachments",
  "exportStoragePath": "/var/lib/life-os/exports",
  "encryptedFile": "lifeos-app-files-backup-20260903-023000.tar.gz.gpg",
  "sha256": "f4c9823128fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b866",
  "sizeBytes": 4827592,
  "archiveFormat": "tar.gz",
  "cipher": "AES256",
  "retentionDays": 35,
  "offsiteStatus": "pending"
}
```

---

## 6. Database-file consistency & restore ordering standards

To prevent database metadata desynchronization (e.g. database referencing non-existent physical attachment files or physical files lacking database record entries), the backup and restore processes enforce strict execution ordering rules:

### 6.1 Nightly Execution Order
1. **02:00 UTC**: PostgreSQL database backup (`life-os/scripts/backup-postgres.sh`) runs and produces encrypted database dump snapshot.
2. **02:30 UTC**: Application file backup (`life-os/scripts/backup-app-files.sh`) runs and archives attachment/export physical files.

### 6.2 Restoration Ordering Protocol
1. **DB First Restoration**: PostgreSQL database MUST be restored FIRST using `life-os/scripts/restore-postgres-backup.sh`.
2. **App Files Restoration**: Application file archive MUST be restored SECOND using `life-os/scripts/restore-app-files-backup.sh`.
3. **Orphan Reconciliation Sweep**:
   - Following restore completion, an automated or operator reconciliation sweep compares physical attachment storage keys (`attachments/{userId}/{attachmentId}`) against `public.attachments` records in PostgreSQL.
   - Any physical file lacking a corresponding `public.attachments` record is quarantined or purged to maintain data privacy standards.
   - Any active database record missing physical file binary flags a recovery alert for inspection.

---

## 7. Retention schedules & privacy data lifecycle rules

In compliance with [docs/31-PRIVACY-DATA-LIFECYCLE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md) and [docs/adr/ADR-012-V1-PRIVACY-POSTURE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-012-V1-PRIVACY-POSTURE.md):

1. **Retention Windows**:
   - **Default Nightly Retention**: 30 days.
   - **Maximum Expiry Ceiling**: 35 days. All backup artifacts (local and off-VPS) older than 35 days MUST be purged automatically during the nightly backup execution sweep.

2. **Account Deletion Grace Period Alignment**:
   - User account deletion requests follow a 30-day grace period followed by hard deletion.
   - The 35-day backup expiry ceiling guarantees that deleted user uploaded files and exports are completely erased from all backup media within 35 days of hard deletion, satisfying DPDP Act and GDPR compliance standards.

---

## 8. Backup monitoring, status tracking & failure alerting

1. **Status Record Location**:
   - Automated nightly backups record their execution result in a host status file:
     `/var/log/life-os/app-files-backup-status.json`

2. **Status Record Schema**:

```json
{
  "lastBackupId": "lifeos-app-files-backup-20260903-023000",
  "lastExecutionTimestamp": "2026-09-03T02:30:00Z",
  "lastStatus": "SUCCESS",
  "lastSizeBytes": 4827592,
  "lastDurationSeconds": 3,
  "consecutiveFailures": 0,
  "offsiteStatus": "replicated"
}
```

3. **Failure Alert Notification Contract**:
   - If archive creation, encryption, checksum generation, or retention pruning returns a non-zero exit code:
     1. Status `"lastStatus"` is updated to `"FAILED"`, and `"consecutiveFailures"` is incremented.
     2. An alert JSON payload is emitted to `/var/log/life-os/alerts.log` and dispatched to external monitoring endpoints (LOS-1610 integration via webhook / SMTP alert).

```json
{
  "alert": "APP_FILES_BACKUP_FAILURE",
  "severity": "CRITICAL",
  "timestamp": "2026-09-03T02:30:00Z",
  "environment": "production",
  "message": "Automated application file backup failed during archive creation. Exit code: 1",
  "consecutiveFailures": 1
}
```

---

## 9. Disaster recovery & restoration runbooks

### 9.1 Full Application Data & File Recovery Runbook

1. **Restore PostgreSQL Database First**:
   - Execute database restore per [docs/42-POSTGRESQL-BACKUP-AND-RESTORE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/42-POSTGRESQL-BACKUP-AND-RESTORE.md):
     ```bash
     BACKUP_ENCRYPTION_PASSPHRASE="<passphrase>" \
     sh life-os/scripts/restore-postgres-backup.sh \
       --backup-file=/var/backups/life-os/postgres/lifeos-postgres-backup-20260903-020000.dump.gpg \
       --target=production
     ```

2. **Locate Target Application File Backup**:
   - Locate matching `.tar.gz.gpg` archive and `.sha256` checksum in `/var/backups/life-os/app-files/` or off-VPS storage.

3. **Verify Checksum**:
   ```bash
   sha256sum -c lifeos-app-files-backup-20260903-023000.sha256
   ```

4. **Execute Automated App Files Restore Script**:
   ```bash
   BACKUP_ENCRYPTION_PASSPHRASE="<passphrase>" \
   sh life-os/scripts/restore-app-files-backup.sh \
     --backup-file=/var/backups/life-os/app-files/lifeos-app-files-backup-20260903-023000.tar.gz.gpg \
     --target=production
   ```

5. **Execute Post-Restore Orphan Reconciliation**:
   - Run storage integrity reconciliation to ensure physical files and DB metadata are 100% synchronized.

---

## 10. Non-logging & secret redaction compliance

In accordance with [LOS-0211](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/handoffs/LOS-0211.md) and [LOS-1602](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md):

1. Secrets, access keys, and encryption passphrases MUST NEVER appear in output logs, status files, or process commands.
2. Temporary files created during backup/decryption are held in mode `0700` directories and securely wiped on script termination (including `TRAP` signals).

---

## 11. Automated verification

Compliance with this application data and file backup specification is audited using the automated script:
`life-os/scripts/validate-app-files-backups.sh`

The script executes static and execution audits for:
- Existence and completeness of this specification (`life-os/docs/43-APPLICATION-DATA-AND-FILE-BACKUP.md`).
- Executable permissions (`0755`) and syntax of `life-os/scripts/backup-app-files.sh` and `life-os/scripts/restore-app-files-backup.sh`.
- Dry-run execution of backup script (`--dry-run`).
- Dry-run execution of restore script (`--dry-run`).
- AES-256 encryption standard assertions.
- 30/35-day retention pruning enforcement logic.
- Secret redaction and non-logging compliance.
- Status JSON and alert payload schema compliance.
