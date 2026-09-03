# LifeOS PostgreSQL backup and restore specification

- Status: Accepted
- Date: 2026-09-03
- Ticket: [LOS-1608](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-1602](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md), [LOS-1604](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/38-PRODUCTION-COMPOSE-AND-CADDY.md), [LOS-1605](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/39-STAGING-ENVIRONMENT.md), [LOS-0113](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md), [ADR-012](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-012-V1-PRIVACY-POSTURE.md)

---

## 1. Executive summary & architectural scope

This specification defines the canonical PostgreSQL backup and restore architecture, AES-256 encryption standards, off-VPS transmission patterns, retention and expiry schedules, privacy deletion-ledger replay procedures, failure monitoring and alerting hooks, full/partial recovery runbooks, and non-logging security rules for LifeOS across production (`buildwithpartha.tech`) and staging (`staging.buildwithpartha.tech`).

In accordance with [docs/31-PRIVACY-DATA-LIFECYCLE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md), [docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md), and [docs/adr/ADR-012-V1-PRIVACY-POSTURE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-012-V1-PRIVACY-POSTURE.md), the database backup framework guarantees zero unencrypted data exposure, deterministic disaster recovery, and strict privacy retention compliance.

This document establishes the backup automation script (`life-os/scripts/backup-postgres.sh`), restore automation script (`life-os/scripts/restore-postgres-backup.sh`), and automated compliance verification audit script (`life-os/scripts/validate-postgres-backups.sh`).

---

## 2. Recovery objectives & schedule

| Metric | Target / Specification | Description |
| --- | --- | --- |
| **RPO (Recovery Point Objective)** | **24 Hours** | Automated nightly backups executed at 02:00 UTC; optional manual dumps triggered before database migrations or infrastructure updates. |
| **RTO (Recovery Time Objective)** | **< 15 Minutes** | Full database decryption, target container initialization, database restoration, and Flyway migration verification. |
| **Backup Window** | **02:00 - 02:15 UTC** | Low-traffic window minimizing lock contention and disk I/O impact. |
| **Dump Format** | **Custom (`pg_dump -Fc`)** | Compressed PostgreSQL custom format supporting selective multi-threaded restore and table-level extraction. |

---

## 3. Cryptographic encryption & secret security

1. **AES-256 Symmetric Encryption**:
   - Every database dump is encrypted immediately upon generation using GnuPG:
     `gpg --symmetric --cipher-algo AES256 --batch --yes --passphrase-fd 0`
   - Unencrypted dump files (`.dump`) are created in isolated, restricted scratch directories (`/tmp/lifeos-backup-*`) with strict permissions (`0700` / `0600`) and deleted immediately after encryption.

2. **Passphrase Derivation & Vault Storage**:
   - Encryption key is supplied via `BACKUP_ENCRYPTION_PASSPHRASE` environment variable.
   - Master passphrase standards require minimum 256-bit entropy (32+ random alphanumeric/symbolic characters).
   - Master passphrases are stored strictly **out-of-band** in encrypted password vaults (e.g. Bitwarden / 1Password) with 2FA protection.

3. **Strict Non-Logging Contract**:
   - Scripts and process pipes MUST NEVER print, log, echo, or expose `BACKUP_ENCRYPTION_PASSPHRASE`, database passwords, or connection URIs in stdout, stderr, process lists, or log files.
   - Command invocations feed passphrases via standard input or subshell file descriptors (`--passphrase-fd 0`), preventing exposure in `ps aux` command-line arguments.

---

## 4. Backup artifact structure & metadata schema

Database backup outputs consist of three linked files stored in the host backup directory (`/var/backups/life-os/postgres`):

```
/var/backups/life-os/postgres/
├── lifeos-postgres-backup-20260903-020000.dump.gpg    # Encrypted AES-256 binary dump
├── lifeos-postgres-backup-20260903-020000.sha256      # SHA-256 checksum file
└── lifeos-postgres-backup-20260903-020000.json        # Structured metadata manifest
```

### JSON Metadata Manifest Schema (`<backup>.json`)

```json
{
  "backupId": "lifeos-postgres-backup-20260903-020000",
  "timestamp": "2026-09-03T02:00:00Z",
  "environment": "production",
  "databaseName": "lifeos_prod",
  "databaseUser": "lifeos_app",
  "encryptedFile": "lifeos-postgres-backup-20260903-020000.dump.gpg",
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "sizeBytes": 1428576,
  "dumpFormat": "custom",
  "cipher": "AES256",
  "pgVersion": "18.4",
  "retentionDays": 35,
  "offsiteStatus": "pending"
}
```

---

## 5. Off-VPS copy transmission & remote replication

1. **Off-Site Copy Architecture**:
   - To safeguard against host VPS disk or datacenter failure, encrypted backups (`.dump.gpg`), checksums (`.sha256`), and manifests (`.json`) are replicated off-site immediately following local dump generation.
   - Supported off-site transport targets include Cloudflare R2, AWS S3, or remote SSH/SFTP storage nodes via secure TLS/SSH channels (`aws s3 cp`, `rclone`, `scp`).

2. **Integrity & Verification**:
   - Off-VPS transport verifies file length and SHA-256 checksum after transmission.
   - Metadata manifest field `"offsiteStatus"` is updated to `"replicated"` upon confirmed remote receipt.

---

## 6. Retention schedules & privacy data lifecycle rules

In compliance with [docs/31-PRIVACY-DATA-LIFECYCLE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md) and [docs/adr/ADR-012-V1-PRIVACY-POSTURE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-012-V1-PRIVACY-POSTURE.md):

1. **Retention Windows**:
   - **Default Nightly Retention**: 30 days.
   - **Maximum Expiry Ceiling**: 35 days. All backup artifacts (local and off-VPS) older than 35 days MUST be purged automatically during the nightly backup execution sweep.

2. **Account Deletion Grace Period Alignment**:
   - User account deletion requests follow a 30-day grace period followed by hard deletion.
   - The 35-day backup expiry ceiling guarantees that deleted user data is completely erased from all backup media within 35 days of hard deletion, satisfying DPDP Act and GDPR compliance standards.

---

## 7. Deletion-ledger replay policy post-restoration

When restoring a database dump from a point in time prior to a user account deletion request:

1. **Deletion-Ledger Preservation**:
   - A separate out-of-band deletion ledger / audit stream (e.g. `/var/log/life-os/account-deletions.log` or persistent audit service) tracks all processed account deletion requests (`userId`, `requestedAt`, `executedAt`).

2. **Post-Restore Replay Standard**:
   - Immediately following any production database restoration from a backup:
     1. The operator MUST inspect the deletion ledger for all account deletion requests executed between the backup timestamp and the present time.
     2. The account deletion service or purge script MUST be re-executed against the restored database for all identified accounts to ensure deleted accounts and personal data are non-recoverable.

---

## 8. Backup monitoring, status tracking & failure alerting

1. **Status Record Location**:
   - Automated nightly backups record their execution result in a host status file:
     `/var/log/life-os/postgres-backup-status.json`

2. **Status Record Schema**:

```json
{
  "lastBackupId": "lifeos-postgres-backup-20260903-020000",
  "lastExecutionTimestamp": "2026-09-03T02:00:00Z",
  "lastStatus": "SUCCESS",
  "lastSizeBytes": 1428576,
  "lastDurationSeconds": 4,
  "consecutiveFailures": 0,
  "offsiteStatus": "replicated"
}
```

3. **Failure Alert Notification Contract**:
   - If `pg_dump`, encryption, checksum generation, or retention pruning returns a non-zero exit code:
     1. Status `"lastStatus"` is updated to `"FAILED"`, and `"consecutiveFailures"` is incremented.
     2. An alert JSON payload is emitted to `/var/log/life-os/alerts.log` and dispatched to external monitoring endpoints (LOS-1610 integration via webhook / SMTP alert).

```json
{
  "alert": "POSTGRES_BACKUP_FAILURE",
  "severity": "CRITICAL",
  "timestamp": "2026-09-03T02:00:00Z",
  "environment": "production",
  "message": "Automated PostgreSQL backup failed during dump execution. Exit code: 1",
  "consecutiveFailures": 1
}
```

---

## 9. Disaster recovery & restoration runbooks

### 9.1 Full Database Recovery Runbook

1. **Identify Target Backup**:
   - Locate the latest valid `.dump.gpg` file and its accompanying `.sha256` checksum in `/var/backups/life-os/postgres/` or off-VPS storage.

2. **Verify Checksum**:
   ```bash
   sha256sum -c lifeos-postgres-backup-20260903-020000.sha256
   ```

3. **Execute Automated Restore Script**:
   ```bash
   BACKUP_ENCRYPTION_PASSPHRASE="<passphrase>" \
   sh life-os/scripts/restore-postgres-backup.sh \
     --backup-file=/var/backups/life-os/postgres/lifeos-postgres-backup-20260903-020000.dump.gpg \
     --target=production
   ```

4. **Verify Database Readiness & Migrations**:
   - The restore script executes a post-restore Flyway migration check to verify database schema version and application connectivity.

5. **Replay Deletion Ledger**:
   - Inspect the out-of-band deletion ledger and execute hard deletion for accounts deleted between backup timestamp and recovery time.

---

### 9.2 Partial & Sampled Data Recovery Runbook

1. **Decrypt Backup to Temporary Location**:
   ```bash
   gpg --decrypt --batch --passphrase "<passphrase>" \
     lifeos-postgres-backup-20260903-020000.dump.gpg > /tmp/sample.dump
   ```

2. **Inspect & Extract Table-Level Data**:
   ```bash
   # List custom dump table contents
   pg_restore -l /tmp/sample.dump

   # Restore specific table (e.g. tasks) into isolated inspection database
   pg_restore -d lifeos_inspection -t tasks /tmp/sample.dump
   ```

3. **Cleanup Temporary Decrypted Dump**:
   ```bash
   rm -f /tmp/sample.dump
   ```

---

## 10. Non-logging & secret redaction compliance

In accordance with [LOS-0211](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/handoffs/LOS-0211.md) and [LOS-1602](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md):

1. Secrets, database passwords, and encryption passphrases MUST NEVER appear in output logs, status files, or process commands.
2. Temporary files created during backup/decryption are held in mode `0700` directories and securely wiped on script termination (including `TRAP` signals).

---

## 11. Automated verification

Compliance with this PostgreSQL backup and restore specification is audited using the automated script:
`life-os/scripts/validate-postgres-backups.sh`

The script executes static and execution audits for:
- Existence and completeness of this specification (`life-os/docs/42-POSTGRESQL-BACKUP-AND-RESTORE.md`).
- Executable permissions (`0755`) and syntax of `life-os/scripts/backup-postgres.sh` and `life-os/scripts/restore-postgres-backup.sh`.
- Dry-run execution of backup script (`--dry-run`).
- Dry-run execution of restore script (`--dry-run`).
- AES-256 encryption standard assertions.
- 30/35-day retention pruning enforcement logic.
- Secret redaction and non-logging compliance.
- Status JSON and alert payload schema compliance.
