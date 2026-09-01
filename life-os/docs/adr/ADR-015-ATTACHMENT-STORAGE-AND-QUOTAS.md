# ADR-015 — Attachment storage architecture, security scanning, quotas, and privacy controls

- Status: Accepted
- Date: 2026-09-01
- Owners: Partha
- Ticket(s): LOS-1309
- Supersedes: None
- Superseded by: None

## Context

LifeOS manages personal productivity and planning data across Tasks (LOS-0818, LOS-1311) and Projects (LOS-0714, LOS-1311). Supporting user-uploaded attachments (documents, images, screenshots, reference files) requires a secure, private, scalable, and cost-controlled storage design.

[ADR-012](./ADR-012-V1-PRIVACY-POSTURE.md) (LifeOS v1 Privacy and External-Processing Posture) established that attachments remain absent until their optional storage/scanning/quota/authorization/privacy gate and a provider/storage ADR pass.

LOS-1309 establishes the binding architectural contract for attachment storage engine selection, per-account and per-file quota limits, strict MIME/magic-byte allowlists, security virus scanning, signed/authenticated download proxying, retention/deletion handling, backup policy, and feature-gate configuration.

## Decision drivers

- **Security & Content Integrity**: Prevent malware distribution, executable upload execution, stored Cross-Site Scripting (XSS), directory traversal, or unauthenticated file access.
- **Privacy & Isolation**: Maintain strict single-user Account scoping (`accountId`), AES-256 encryption at rest, zero public bucket access, zero third-party AI training exposure, and reliable purge upon Account deletion (LOS-0518).
- **Resource & Heap Bounds**: Prevent application memory exhaustion or server buffer exhaustion when handling uploads; enforce bounded file sizes, bounded total storage per account, and stream processing boundaries.
- **Cost & Operational Simplicity**: S3-compatible API target enabling MinIO for local development/testing and Cloudflare R2 / AWS S3 / Hetzner S3 for production with predictable operational costs.
- **Controlled Feature Activation**: Keep the attachment capability behind an explicit, disabled-by-default feature flag until implementation (LOS-1310) and UX integration (LOS-1311) complete.

## Options considered

### Option A — Private S3-Compatible Storage with Authenticated Download Proxy & Asynchronous Security Scanning (Chosen)

Store attachment binaries in a private, unlisted S3-compatible object store using randomized 128-bit UUID keys (`attachments/{accountId}/{uuid}`). Backend enforces strict pre-upload validation (size, MIME type, magic-byte inspection), stream proxy download with `Content-Disposition: attachment`, and asynchronous virus scanning via the `BackgroundJob` framework (LOS-1403).

- *Benefits*: Decouples file payload storage from relational database; excellent scalability; S3 API standard works across local MinIO and production cloud providers; strict security controls prevent stored XSS and malware execution.
- *Costs*: Requires S3 container/bucket setup in environments; scanning step introduces temporary `PENDING_SCAN` state before download release.

### Option B — Local Application Filesystem Storage

Save file attachments directly to the local server disk on the host VPS.

- *Benefits*: No S3 API dependency.
- *Costs*: Severe horizontal scaling limits; high risk of path traversal bugs; complex backup management; vulnerable to server disk exhaustion.

### Option C — Direct Unfiltered S3 Presigned Uploads from Client

Generate client presigned S3 upload URLs directly from the frontend to bypass application server upload traffic.

- *Benefits*: Offloads upload bandwidth from the backend API server.
- *Costs*: Bypasses server-side magic-byte inspection and virus scanning pre-checks before data lands in storage; complicates quota enforcement and quota rollback on upload failures.

## Decision

We adopt **Option A** as the binding attachment storage architecture for LifeOS:

1. **Storage Backend & Provider Contract**:
   - Provider Interface: S3-compatible object storage (MinIO for local dev/integration tests; Cloudflare R2 or AWS S3 for production).
   - Storage Encryption: AES-256 server-side encryption enabled on all buckets.
   - Bucket Visibility: Strictly private (no public access, no public bucket policy, no direct unauthenticated URLs).
   - Object Key Structure: `attachments/{accountId}/{attachmentId}` using 128-bit UUIDs for `attachmentId` to prevent key guessing or enumeration.

2. **Quotas & Resource Limits**:
   - **Per-file limit**: Maximum 25 MB (`26,214,400` bytes) per uploaded file.
   - **Per-account storage quota**: Maximum 2 GB (`2,147,483,648` bytes) total active attachments per Account.
   - **Per-entity attachment limit**: Maximum 20 attachments per Task or Project.
   - Quota Enforcement: Atomic database transaction checks total existing attachment size before accepting an upload initiation request.

3. **MIME Type Allowlists & Magic-Byte Validation**:
   - Allowed MIME Types:
     - Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`.
     - Documents: `application/pdf`, `text/plain`, `text/markdown`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
   - Forbidden Extensions/Types: Executables (`.exe`, `.sh`, `.bat`, `.dll`, `.cmd`, `.py`, `.js`), HTML (`text/html`), SVG (`image/svg+xml`), and unknown binary streams (`application/octet-stream`).
   - Magic-Byte Inspection: Backend validates binary file headers (magic numbers) during upload ingestion/finalization to prevent MIME-spoofing bypasses.

4. **Access Control & Secure Download Proxy**:
   - Direct S3 bucket access is blocked for clients.
   - All attachment metadata and file content requests pass through authenticated backend REST endpoints (`GET /api/v1/attachments/{id}` and `GET /api/v1/attachments/{id}/download`).
   - Authorization: Verification that the requesting session belongs to the Account (`accountId`) owning the attachment record.
   - Security Headers: File downloads are served with `Content-Disposition: attachment; filename="{sanitizedFilename}"`, `X-Content-Type-Options: nosniff`, and `Content-Security-Policy: default-src 'none'`.

5. **Malware & Security Scanning**:
   - Upload Status Lifecycle: `PENDING_SCAN` -> `CLEAN` / `QUARANTINED`.
   - Upon upload completion, backend enqueues an asynchronous scanning job via `BackgroundJob` (LOS-1403) targeting ClamAV / scanner service.
   - Downloads of files in `PENDING_SCAN` or `QUARANTINED` states are rejected with `HTTP 423 Locked` or `HTTP 403 Forbidden` with an informative error message.
   - Quarantined files are automatically purged from S3 storage after 7 days and audit logged.

6. **Lifecycle, Account Deletion & Retention**:
   - Soft & Hard Deletion: User deletion of an attachment soft-deletes the metadata and enqueues object removal from S3 store.
   - Account Deletion (LOS-0518): During the 30-day Account deletion grace period, attachment objects associated with the Account are hard-purged from S3 storage by `AccountDeletionPurgeJob`.
   - Backup Retention: Object storage snapshots and bucket versioning follow ADR-012's maximum 35-day backup retention lifetime.

7. **Feature Gate Control**:
   - Feature Toggle: `lifeos.features.attachments.enabled` (default `false`).
   - UI Visibility: When disabled, attachment tabs, upload controls, and related API routes respond with disabled states or `HTTP 404 Not Found`.

## Consequences

### Positive

- Clear security boundaries prohibiting malware distribution and XSS attacks.
- Strict quota controls prevent unexpected storage cost inflation.
- S3-compatible API guarantees dev/test parity using containerized MinIO.
- Seamless integration with existing Account deletion (LOS-0518) and background job (LOS-1403) mechanisms.

### Negative and risks

- Asynchronous virus scanning introduces a brief `PENDING_SCAN` latency window before file download availability.
- Local development requires a MinIO service container in `docker-compose.yml` or Testcontainers setup for integration tests.

### Follow-up work

- **LOS-1310**: Implement attachment backend (private upload initiation/finalize/download/delete REST endpoints, Flyway schema, S3 storage client, ClamAV scanner integration, quota checks, and audit logging).
- **LOS-1311**: Integrate attachment UI frontend (uploader, progress bar, file list, scan status indicators, Task/Project details tab integration).

## Security, privacy and data impact

- **Data Flow**: Browser -> API Server (auth check, magic-byte inspection, quota check) -> S3 Private Bucket. Download: Browser <- API Server (auth check, forced download header) <- S3 Private Bucket.
- **Encryption**: AES-256 at rest in S3 store; TLS 1.3 in transit.
- **Privacy**: Zero public accessibility; zero AI processing/training; full purge on account deletion within 30-day grace period.

## Rollout and rollback

- Controlled via `lifeos.features.attachments.enabled` configuration flag.
- Safe rollback: Setting toggle to `false` disables attachment endpoints and hides frontend controls without data loss.

## Validation

- ADR published and accepted in `docs/adr/ADR-015-ATTACHMENT-STORAGE-AND-QUOTAS.md`.
- Summary outcome logged in `docs/10-DECISIONS.md`.
- Backlog state updated in `docs/backlog/EPIC-13-PLATFORM-FEATURES.md` and `docs/backlog/STATUS.md`.
