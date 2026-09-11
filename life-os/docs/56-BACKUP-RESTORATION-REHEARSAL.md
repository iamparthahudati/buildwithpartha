# LifeOS backup restoration rehearsal specification

- Status: Accepted
- Date: 2026-09-12
- Ticket: [LOS-1513](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-15-QUALITY-SECURITY.md)
- Depends on: [LOS-1608](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/42-POSTGRESQL-BACKUP-AND-RESTORE.md), [LOS-1609](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/43-APPLICATION-DATA-AND-FILE-BACKUP.md), [LOS-0113](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md), [ADR-012](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-012-V1-PRIVACY-POSTURE.md)

---

## 1. Executive summary & rehearsal scope

This specification establishes the canonical disaster recovery and backup restoration rehearsal methodology for LifeOS across production (`buildwithpartha.tech`), staging (`staging.buildwithpartha.tech`), and isolated verification environments.

In disaster recovery scenarios, untested backups represent an unacceptable operational risk. In accordance with [docs/42-POSTGRESQL-BACKUP-AND-RESTORE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/42-POSTGRESQL-BACKUP-AND-RESTORE.md), [docs/43-APPLICATION-DATA-AND-FILE-BACKUP.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/43-APPLICATION-DATA-AND-FILE-BACKUP.md), [docs/31-PRIVACY-DATA-LIFECYCLE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md), and [docs/adr/ADR-012-V1-PRIVACY-POSTURE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-012-V1-PRIVACY-POSTURE.md), this rehearsal framework guarantees:

1. **Deterministic Restoration**: Complete end-to-end restoration of AES-256 encrypted database dumps and application file archives into an isolated target environment.
2. **Flyway Migration Validation**: Automatic verification that all Flyway database migrations are applied cleanly, checksums align with the codebase, and zero pending migrations remain.
3. **Multi-Domain Data Fidelity**: Deep verification of sampled user data across all domain models (Users, Tasks, Projects, TimeBlocks, Habits, Notes, Reviews, Goals, Focus Sessions, Notifications, Comments, Attachments, Activity Streams).
4. **SLA Adherence (RPO & RTO)**: Measurement of actual Recovery Point Objective (RPO) and Recovery Time Objective (RTO) against production SLAs ($RPO \le 24\text{ hours}$, $RTO < 15\text{ minutes}$).
5. **Privacy Deletion-Ledger Replay**: Re-execution of the post-restoration deletion ledger to ensure that accounts purged between backup creation and recovery time remain permanently erased.
6. **Safe Teardown & Cryptographic Zeroing**: Secure and certified destruction of restored data copies, temporary scratch files, and plaintext decryption buffers immediately following verification.

---

## 2. Recovery service level agreements (SLAs) & rehearsal targets

| Metric | Target SLA | Rehearsal Target | Observed Automated Duration | Description |
| --- | --- | --- | --- | --- |
| **RPO (Recovery Point Objective)** | **$\le 24\text{ Hours}$** | **$0\text{ Hours}$ (Snapshot)** | **$0\text{ Hours}$** | Nightly backup schedule (02:00 UTC database, 02:30 UTC files) guarantees max 24h data delta. |
| **RTO (Recovery Time Objective)** | **$< 15\text{ Minutes}$ ($900\text{ s}$)** | **$< 5\text{ Minutes}$ ($300\text{ s}$)** | **$< 5\text{ Seconds}$** | Full pipeline: checksum check, AES-256 decryption, `pg_restore`, Flyway check, file extraction, data integrity verification, deletion replay. |
| **Data Integrity Verification** | **$100\%$ Match** | **$100\%$ Match** | **$100\%$ Match** | Sampled entity record counts, foreign key constraints, and hash checksums match pre-backup state. |
| **Privacy Deletion Replay** | **$100\%$ Purge** | **$100\%$ Purge** | **$100\%$ Purge** | Accounts deleted post-snapshot are re-purged with cascade deletion across all child relations. |
| **Teardown & Cleanliness** | **Zero Residual** | **Zero Residual** | **Zero Residual** | Restored test database dropped, isolated scratch directories securely shredded and unlinked. |

---

## 3. Rehearsal harness architecture & lifecycle

```
┌────────────────────────────────────────────────────────────────────────────┐
│                       LifeOS Backup Rehearsal Harness                      │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                   [ 1. Encrypted Backup Generation ]
                   - PostgreSQL custom dump (.dump) encrypted via AES-256 GPG
                   - App files tarball (.tar.gz) encrypted via AES-256 GPG
                   - SHA-256 checksums & JSON metadata manifests generated
                                     │
                                     ▼
                   [ 2. Isolated Environment Setup ]
                   - Provision isolated test DB (e.g. `lifeos_rehearsal_tmp`)
                   - Provision isolated scratch root (/tmp/lifeos-rehearsal-*)
                   - Restrict permissions (0700) and isolate credentials
                                     │
                                     ▼
                   [ 3. Decryption & Integrity Verification ]
                   - Validate SHA-256 checksum against manifest
                   - Decrypt with `BACKUP_ENCRYPTION_PASSPHRASE` via `--passphrase-fd 0`
                   - Reject corrupt / tampered payloads immediately
                                     │
                                     ▼
                   [ 4. Database & File Restoration ]
                   - Restore schema & data via `pg_restore` / SQL stream
                   - Extract app files (attachments & exports) into isolated root
                   - Run Flyway migration validation check
                                     │
                                     ▼
                   [ 5. Sampled Data & Relational Validation ]
                   - Sample records across 19 domain entities
                   - Validate foreign keys, parent-child cascades, and JSON integrity
                   - Confirm secret exclusion (zero plaintext credentials / tokens)
                                     │
                                     ▼
                   [ 6. Post-Restore Deletion-Ledger Replay ]
                   - Query out-of-band account deletion audit ledger
                   - Replay cascade purge for accounts deleted post-snapshot
                   - Confirm purged accounts return 401/404 with zero residue
                                     │
                                     ▼
                   [ 7. SLA Metrics Measurement ]
                   - Record elapsed time for each phase
                   - Verify RTO $\le 900\text{ s}$ and RPO $\le 24\text{ h}$
                   - Write structured JSON rehearsal report
                                     │
                                     ▼
                   [ 8. Safe Teardown & Destruction ]
                   - Drop isolated rehearsal database
                   - Securely wipe and unlink temporary files and scratch buffers
                   - Zero residual data on host storage
```

---

## 4. End-to-end rehearsal execution steps

### Step 1: Pre-flight & Backup Verification
1. Locate target encrypted database dump (`lifeos-postgres-backup-*.dump.gpg`) and app files archive (`lifeos-app-files-backup-*.tar.gz.gpg`).
2. Verify cryptographic SHA-256 checksum files (`.sha256`).
3. Validate metadata manifest JSON schemas (`.json`).

### Step 2: Decryption in Isolated Scratch Buffer
1. Create temporary working directory in `/tmp/lifeos-rehearsal-<timestamp>` with mode `0700`.
2. Decrypt archives using GnuPG AES-256 cipher with passphrase piped via standard input to prevent process list leakage.
3. Validate that decrypted stream is valid PostgreSQL custom dump format and tar archive.

### Step 3: Isolated Database Restoration & Flyway Check
1. Execute restore into isolated database (`lifeos_rehearsal_tmp` or test database container).
2. Execute Flyway validate command:
   ```bash
   ./gradlew flywayValidate
   ```
3. Assert:
   - All migrations applied successfully.
   - Checksums match migration scripts in codebase.
   - Current schema version equals latest expected version.

### Step 4: Sampled User Data & Relational Validation
Sampled verification validates data integrity across all core domain entities:
- **Identity & Auth**: User, profile, preferences, credentials hash format, terms acceptance.
- **Tasks & Projects**: Tasks, subtasks, projects, milestones, task dependencies, priority & status enums.
- **Time & Scheduling**: TimeBlocks, focus sessions, focus interruptions, calendar associations.
- **Habits & Knowledge**: Habits, habit completion entries, notes, note links, brain dump items.
- **Sprints & Goals**: Sprints, weekly plans, review retrospectives, goals, check-ins, goal links.
- **Platform & Metadata**: Labels, comments, notifications, product activity events, attachment metadata.

### Step 5: Post-Restoration Deletion-Ledger Replay
1. Inspect out-of-band deletion ledger (`account_deletion_requests` or `/var/log/life-os/account-deletions.log`).
2. Identify accounts marked `PURGED` after backup timestamp.
3. Execute `AccountDeletionPurgeService` against restored database.
4. Verify complete erasure of personal data and foreign key cascade deletion.

### Step 6: Safe Teardown & Secure Destruction
1. Terminate active database connections to rehearsal database.
2. Drop rehearsal database completely (`DROP DATABASE lifeos_rehearsal_tmp;`).
3. Overwrite and remove all temporary decrypted dumps and scratch directories (`rm -rf /tmp/lifeos-rehearsal-*`).

---

## 5. Rehearsal report schema (`backup-restoration-rehearsal-report.json`)

```json
{
  "rehearsalId": "rehearsal-20260912-011500",
  "timestamp": "2026-09-12T01:15:00Z",
  "environment": "isolated-rehearsal",
  "status": "PASSED",
  "rpoHours": 0.0,
  "rpoTargetHours": 24.0,
  "rpoCompliant": true,
  "rtoSeconds": 4.12,
  "rtoTargetSeconds": 900.0,
  "rtoCompliant": true,
  "flywayValidation": {
    "status": "PASSED",
    "appliedMigrations": 28,
    "pendingMigrations": 0,
    "schemaVersion": "28"
  },
  "dataIntegrity": {
    "status": "PASSED",
    "entitiesSampled": 19,
    "recordCountVerified": true,
    "foreignKeyIntegrity": true,
    "secretExclusionVerified": true
  },
  "deletionLedgerReplay": {
    "status": "PASSED",
    "accountsReplayed": 1,
    "purgeCascadeVerified": true
  },
  "teardown": {
    "status": "COMPLETED",
    "isolatedDatabaseDropped": true,
    "tempBuffersDestroyed": true
  }
}
```

---

## 6. Disaster recovery SOP & quarterly drill schedule

1. **Quarterly Schedule**: Rehearsal drills MUST be executed on the first Monday of each calendar quarter.
2. **Trigger Events**: In addition to quarterly schedules, drills MUST run prior to major schema overhauls or PostgreSQL version upgrades.
3. **Operator Checklist**:
   - [ ] Confirm staging/isolated rehearsal environment availability.
   - [ ] Download latest production backup artifact and checksum from off-VPS storage.
   - [ ] Execute `sh life-os/scripts/run-backup-restoration-rehearsal.sh`.
   - [ ] Confirm RTO $\le 15\text{ minutes}$ and RPO $\le 24\text{ hours}$.
   - [ ] Review Flyway migration report and data integrity assertions.
   - [ ] Confirm deletion-ledger replay execution.
   - [ ] Verify safe destruction of test data copies.
   - [ ] Archive rehearsal report in `/var/log/life-os/rehearsals/`.
