# LifeOS automated deployment pipeline specification

- Status: Accepted
- Date: 2026-09-03
- Ticket: [LOS-1607](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-1602](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md), [LOS-1603](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/37-PRODUCTION-CONTAINERS.md), [LOS-1605](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/39-STAGING-ENVIRONMENT.md), [LOS-1606](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/40-CLOUDFLARE-DNS-PROXY-AND-TLS.md)

---

## 1. Executive summary & architectural scope

This specification defines the canonical automated deployment pipeline architecture, immutable container tagging conventions, SBOM artifact generation, database migration ordering rules, deployment audit logging schema, and secret-safe execution contract for LifeOS across staging (`staging.buildwithpartha.tech`) and production (`buildwithpartha.tech`).

In accordance with [ADR-011](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-011-MAIN-SITE-LIFEOS-BOUNDARY.md), [docs/07-GIT-WORKFLOW.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/07-GIT-WORKFLOW.md), [docs/37-PRODUCTION-CONTAINERS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/37-PRODUCTION-CONTAINERS.md), [docs/38-PRODUCTION-COMPOSE-AND-CADDY.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/38-PRODUCTION-COMPOSE-AND-CADDY.md), and [docs/39-STAGING-ENVIRONMENT.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/39-STAGING-ENVIRONMENT.md), the deployment pipeline guarantees deterministic, repeatable, security-scanned, and fully audited releases from source commit to production deployment.

This document establishes the deployment pipeline script (`life-os/scripts/deploy-pipeline.sh`), GitHub Actions deployment workflow (`.github/workflows/lifeos-deploy.yml`), and automated compliance verification contract (`life-os/scripts/validate-deployment-pipeline.sh`).

---

## 2. Deployment pipeline topology & lifecycle stages

The LifeOS deployment lifecycle consists of five sequential stages executing in GitHub Actions CI/CD and on the Hostinger VPS origin host (`srv1883798.hstgr.cloud`).

```
+-----------------------------------------------------------------------------------------------------------------+
| Stage 1: Build, Test & Scan (CI)                                                                               |
| - Documentation, Frontend & Backend Quality Gates                                                               |
| - Security & Secret Scanning (Gitleaks)                                                                        |
+-----------------------------------------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------------------------------------+
| Stage 2: Immutable Container Build, Digest Pinning & SBOM Generation                                           |
| - Tag images with Git SHA & Release Version (lifeos-web:<sha>, lifeos-api:<sha>)                               |
| - Generate SPDX / CycloneDX SBOM Attestations via Syft                                                         |
| - Verify Image Digest (@sha256:...)                                                                            |
+-----------------------------------------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------------------------------------+
| Stage 3: Staging Deployment & Automated Smoke Verification                                                      |
| - Deploy Release Candidate to staging.buildwithpartha.tech                                                      |
| - Pre-rollout Flyway DB Migration Ordering Check                                                               |
| - Run Staging Environment Audit (validate-staging-environment.sh --dry-run)                                   |
| - Perform HTTP Health Probes (/life-os/ & /life-os/api/v1/actuator/health)                                      |
+-----------------------------------------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------------------------------------+
| Stage 4: Manual Release Approval Gate                                                                          |
| - Required Human Review on Release Tagging (vX.Y.Z) on master branch                                           |
| - GitHub Protected Environment Approval                                                                        |
+-----------------------------------------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------------------------------------+
| Stage 5: Production Deployment & Deployment Audit Record                                                        |
| - Production Deploy to buildwithpartha.tech from Tagged master                                                  |
| - Pre-rollout Flyway DB Migration Execution                                                                    |
| - Atomic Compose Rolling Service Swap (compose.prod.yml)                                                       |
| - Post-rollout Health Probes & Production Audit (validate-production-compose.sh --dry-run)                     |
| - Append Secret-Redacted Deployment Audit Record (/var/log/life-os/deployments.json)                           |
+-----------------------------------------------------------------------------------------------------------------+
```

### Stage Summary Table:

| Stage | Name | Target Environment | Trigger / Input | Primary Responsibility |
| --- | --- | --- | --- | --- |
| **Stage 1** | Build & Test | GitHub Actions | Push to `develop`/`master`, PR | Unit tests, linting, type checks, secret scanning, OpenAPI artifact export. |
| **Stage 2** | Container & SBOM | GitHub Actions | Merge to `develop`/`master`, Tag | Build Docker images, generate SBOM artifacts, verify immutable sha256 digests. |
| **Stage 3** | Staging Deploy | Staging VPS | Automatic on `develop` update | Run Flyway migrations, update staging containers, execute staging smoke tests. |
| **Stage 4** | Release Approval | GitHub Actions | Release tag `v*.*.*` on `master` | Manual gate approval before production deployment execution. |
| **Stage 5** | Production Deploy | Production VPS | Tagged `master` approval | Execute pre-deploy migrations, apply production compose, log secret-safe audit record. |

---

## 3. Immutable container tagging, digest verification & SBOM generation strategy

Container image immutability and software bill of materials (SBOM) generation ensure traceably verified release artifacts.

### 1. Immutable Tagging Rules:
- **Primary Commit Tag**: Every build produces an image tagged with the short Git commit SHA (`lifeos-web:<git-sha>`, `lifeos-api:<git-sha>`).
- **Release Version Tag**: Production builds produce immutable semantic version tags (`lifeos-web:v1.0.0`, `lifeos-api:v1.0.0`).
- **Digest Verification**: Each container build extracts and verifies its immutable digest (`@sha256:<hash>`).
- **Prohibited Tags**: `latest`, `dev`, `master`, and floating timestamps are strictly forbidden for production container references.

### 2. SBOM Generation Standards:
- SBOM artifacts are generated during container build execution using `syft` or Docker Buildx SBOM attestations per [52-DEPENDENCY-SECRET-CONTAINER-SCANS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/52-DEPENDENCY-SECRET-CONTAINER-SCANS.md) ([LOS-1508](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-15-QUALITY-SECURITY.md)).
- Supported Formats:
  - **SPDX JSON**: `artifacts/sbom/lifeos-web-<tag>.spdx.json`, `artifacts/sbom/lifeos-api-<tag>.spdx.json`.
  - **CycloneDX JSON**: `artifacts/sbom/lifeos-web-<tag>.cdx.json`, `artifacts/sbom/lifeos-api-<tag>.cdx.json`.
- SBOMs record all base OS packages (Alpine), Java runtime dependencies, Node modules, and Nginx modules for vulnerability tracking.

---

## 4. Database migration ordering & zero-downtime schema rollout

To guarantee database integrity and prevent data corruption during deployments:

### Migration Ordering Rules:
1. **Pre-flight Migration Execution**: Database schema migrations (`flyway migrate`) MUST execute **prior** to updating or restarting API runtime containers.
2. **Backwards Compatibility**: Schema changes MUST be backward-compatible with running API containers (e.g., adding columns with default values or nullability first, dropping unused columns in follow-up releases).
3. **Migration Locking**: Flyway uses dedicated schema history locks (`flyway_schema_history`) to prevent concurrent migration attempts.
4. **Staging Verification**: All Flyway SQL scripts are validated against a synthetic staging database prior to production execution.

---

## 5. Deployment record schema & audit logging

Every deployment to staging or production automatically appends a structured, secret-sanitized JSON deployment audit record to `/var/log/life-os/deployments.json` (or `artifacts/deployments.json` during dry-run validation).

### Deployment Audit Record Schema:

```json
{
  "deployment_id": "dep-20260903-100000-a1b2c3d4",
  "timestamp": "2026-09-03T10:00:00Z",
  "environment": "production",
  "git_commit": "a1b2c3d4e5f67890123456789012345678901234",
  "git_ref": "refs/tags/v1.0.0",
  "release_version": "v1.0.0",
  "images": {
    "web": "lifeos-web:v1.0.0@sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "api": "lifeos-api:v1.0.0@sha256:cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce"
  },
  "db_migration": {
    "status": "SUCCESS",
    "applied_migrations": ["V32__deployment_pipeline_schema.sql"]
  },
  "deployer": "github-actions[bot]",
  "status": "SUCCESS",
  "duration_seconds": 42
}
```

---

## 6. Secret-safe deployment logging & redaction enforcement

All deployment tools, shell scripts, and CI/CD pipelines enforce zero secret exposure.

### Redaction Principles:
1. **Automated Secret Filtering**: Shell scripts sanitize standard output and error output through text redaction (`sed` masking patterns for passphrases, tokens, and authorization headers).
2. **Environment Variable Masking**: GitHub Actions masks all secrets passed via `secrets.*` (`POSTGRES_PASSWORD`, `JWT_SECRET`, `CLOUDFLARE_API_TOKEN`).
3. **Log Sanitization Verification**: Deploy scripts run post-deployment regex scans against generated deployment logs ensuring zero plain-text match for secret keys or password parameters.
