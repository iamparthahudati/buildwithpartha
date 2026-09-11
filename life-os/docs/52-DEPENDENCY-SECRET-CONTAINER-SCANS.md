# LifeOS Dependency, Secret, and Container Scanning Specification

- Status: Accepted
- Date: 2026-09-11
- Ticket: [LOS-1508](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-15-QUALITY-SECURITY.md)
- Depends on: [LOS-0212](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/07-GIT-WORKFLOW.md), [LOS-1603](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/37-PRODUCTION-CONTAINERS.md)

---

## 1. Executive Summary & Scope

This specification establishes the automated vulnerability, secret, and container scanning architecture, release gating policies, Software Bill of Materials (SBOM) generation standards, and SLSA-aligned build provenance attestations for LifeOS.

Security scanning is executed continuously across the software development lifecycle:
1. **Developer Workstation / Pre-commit**: Local linting, secret screening, and dependency audit verification.
2. **Continuous Integration (CI Pipeline)**: Pull-request and merge-to-`develop`/`master` gating for dependencies, committed history secrets, and production container images.
3. **Scheduled Continuous Monitoring**: Automated nightly scanning (`0 2 * * *` UTC) across `develop` and `master` branches to discover newly disclosed CVEs and base image vulnerabilities without waiting for application code pushes.
4. **Release & Deployment Gates**: Immutable image tag digest verification, SPDX/CycloneDX SBOM generation, provenance attestation, and blocking zero-tolerance checks for unexempted `CRITICAL` and `HIGH` findings.

---

## 2. Multi-Tier Security Scanning Matrix

| Scan Layer | Target Surfaces | Scanner Engine & Tooling | Execution Frequency | Failure Threshold / Gate |
| --- | --- | --- | --- | --- |
| **Secret Scanning** | Complete Git commit history, configuration files, environment variables, scripts | Gitleaks (`gitleaks-action` pinned commit SHA, local CLI) | Every commit, PR, push, and nightly | Any detected secret or token (Zero tolerance, no exceptions permitted) |
| **Frontend Dependencies** | `apps/web/package.json`, `apps/web/package-lock.json` v3 | `npm audit`, Dependabot security alerts | Every PR, push to `develop`/`master`, and nightly | `CRITICAL` / `HIGH` block release unless active approved exception |
| **Backend Dependencies** | `apps/api/build.gradle.kts`, `apps/api/gradle.lockfile`, Gradle wrapper | Gradle dependency verification, Dependabot security alerts, OWASP / Trivy fs scan | Every PR, push to `develop`/`master`, and nightly | `CRITICAL` / `HIGH` block release unless active approved exception |
| **Container Base & Packages** | `apps/web/Dockerfile`, `apps/api/Dockerfile`, runtime container images | Trivy (`aquasecurity/trivy-action` pinned commit SHA, local CLI) | Every push to `develop`/`master`, deployment, and nightly | `CRITICAL` / `HIGH` block release unless active approved exception |
| **SBOM & Provenance** | Packaged React SPA, Spring Boot fat JAR, Alpine base OS layers | Syft (SPDX JSON, CycloneDX JSON), SLSA provenance generator | Every container build and deployment pipeline run | Missing, malformed, or unverified SBOM / provenance artifact blocks release |

---

## 3. Severity Classification & Remediation SLAs

LifeOS classifies vulnerability findings according to the Common Vulnerability Scoring System (CVSS v3.1 / v4.0) base metrics:

```
+-------------------------------------------------------------------------------+
| CRITICAL (CVSS 9.0 - 10.0) | Remediation SLA: < 48 Hours | RELEASE BLOCKER    |
+-------------------------------------------------------------------------------+
| HIGH     (CVSS 7.0 - 8.9)  | Remediation SLA: < 7 Days   | RELEASE BLOCKER    |
+-------------------------------------------------------------------------------+
| MEDIUM   (CVSS 4.0 - 6.9)  | Remediation SLA: < 30 Days  | Tracked in Backlog |
+-------------------------------------------------------------------------------+
| LOW      (CVSS 0.1 - 3.9)  | Remediation SLA: < 90 Days  | Tracked in Backlog |
+-------------------------------------------------------------------------------+
```

### 3.1 Gating Rules
- **CRITICAL / HIGH Findings**: Any unexempted `CRITICAL` or `HIGH` vulnerability in direct or transitive application dependencies or container OS layers **strictly fails CI builds and aborts staging and production deployments**.
- **MEDIUM / LOW Findings**: Logged in scan artifacts, surfaced in security reporting, and triaged into the engineering backlog per normal dependency management cadence ([DEPENDENCY-POLICY.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/DEPENDENCY-POLICY.md)).
- **Secret Findings**: Always blocking. **No exceptions or allowlists are permitted for secrets, keys, or credentials.**

---

## 4. Vulnerability Exception & Allowlist Governance

When an upstream fix for a `CRITICAL` or `HIGH` vulnerability is not yet available, and the vulnerability is determined to be non-exploitable in the LifeOS execution context (e.g., vulnerable code path is uninvoked, isolated behind authentication, or mitigated by defense-in-depth controls like strict CSP/non-root container execution), a temporary exception may be documented.

### 4.1 Exception Registry Schema (`life-os/security/scan-exceptions.json`)

All active exceptions must be registered in the machine-readable registry file [`life-os/security/scan-exceptions.json`](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/security/scan-exceptions.json) conforming to this strict JSON schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "LifeOS Vulnerability Exceptions Registry",
  "type": "object",
  "required": ["version", "last_updated", "exceptions"],
  "properties": {
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "last_updated": { "type": "string", "format": "date" },
    "exceptions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id",
          "target",
          "vulnerability_id",
          "package",
          "severity",
          "reason",
          "compensating_controls",
          "owner",
          "created_at",
          "expires_at",
          "status"
        ],
        "properties": {
          "id": { "type": "string", "pattern": "^EXP-\\d{4}-\\d{3,4}$" },
          "target": { "type": "string", "enum": ["web", "api", "container-web", "container-api", "infra"] },
          "vulnerability_id": { "type": "string", "pattern": "^(CVE-\\d{4}-\\d+|GHSA-[a-z0-9-]+)$" },
          "package": { "type": "string" },
          "severity": { "type": "string", "enum": ["CRITICAL", "HIGH"] },
          "reason": { "type": "string", "minLength": 20 },
          "compensating_controls": { "type": "string", "minLength": 20 },
          "owner": { "type": "string" },
          "created_at": { "type": "string", "format": "date" },
          "expires_at": { "type": "string", "format": "date" },
          "status": { "type": "string", "enum": ["APPROVED", "REVIEW", "EXPIRED", "RESOLVED"] }
        }
      }
    }
  }
}
```

### 4.2 Exception Lifespan & Expiration Policy
1. **Maximum Duration**: Exceptions may be granted for a maximum lifetime of **30 calendar days** from the creation date.
2. **Automated Expiry Gating**: The CI security scanner and validator (`life-os/scripts/validate-security-scans.sh`) check the `expires_at` date against the current system date. **Any expired exception (`current_date > expires_at`) or exception with `status != APPROVED` causes immediate build failure.**
3. **Owner Accountability**: Every exception must designate a named engineering owner who is responsible for weekly monitoring of upstream patches and decommissioning the exception upon resolution.
4. **Renewal Review**: Renewing an exception requires creating a new LOS ticket, updating `reason` and `compensating_controls`, and receiving formal owner re-approval.

---

## 5. Software Bill of Materials (SBOM) Generation Standards

Every production container and release build generates canonical, cryptographically verifiable Software Bill of Materials artifacts in both **SPDX** (ISO/IEC 5962:2021) and **CycloneDX** JSON standards.

### 5.1 SBOM Artifact Hierarchy

```
artifacts/sbom/
├── lifeos-web-<release-tag>.spdx.json      # Web container & npm package inventory (SPDX format)
├── lifeos-web-<release-tag>.cdx.json       # Web container & npm package inventory (CycloneDX format)
├── lifeos-api-<release-tag>.spdx.json      # API container & Java/Gradle jar inventory (SPDX format)
├── lifeos-api-<release-tag>.cdx.json       # API container & Java/Gradle jar inventory (CycloneDX format)
└── provenance.json                         # SLSA Level 3 build provenance attestation
```

### 5.2 Required Package Metadata in SBOMs
- **Package Identity**: Canonical package name, namespace, version, and Package URL (purl, e.g., `pkg:npm/react@19.0.0`, `pkg:maven/org.springframework.boot/spring-boot@3.4.3`, `pkg:alpine/openssl@3.3.2-r0`).
- **Cryptographic Hashes**: SHA-256 and SHA-512 hashes for all packaged files, JARs, and container layers.
- **License Identification**: SPDX license identifiers (e.g., `MIT`, `Apache-2.0`, `BSD-3-Clause`).
- **Supplier & Origin**: Source repository URL and upstream distributor.

### 5.3 Automated Generation Contract

The script [`life-os/scripts/generate-sbom-and-provenance.sh`](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/scripts/generate-sbom-and-provenance.sh) executes during container build and release pipeline execution:

```bash
# Generate Web container SBOMs
syft dir:life-os/apps/web -o spdx-json=life-os/artifacts/sbom/lifeos-web-$RELEASE_TAG.spdx.json
syft dir:life-os/apps/web -o cyclonedx-json=life-os/artifacts/sbom/lifeos-web-$RELEASE_TAG.cdx.json

# Generate API container SBOMs
syft dir:life-os/apps/api -o spdx-json=life-os/artifacts/sbom/lifeos-api-$RELEASE_TAG.spdx.json
syft dir:life-os/apps/api -o cyclonedx-json=life-os/artifacts/sbom/lifeos-api-$RELEASE_TAG.cdx.json
```

---

## 6. SLSA Build Provenance & Attestations

To prevent supply-chain tampering and guarantee build reproducibility, release builds generate an in-toto formatted **SLSA Level 3** build provenance attestation ([`provenance.json`](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/artifacts/sbom/provenance.json)).

### 6.1 Provenance Attestation Structure
- **Builder**: Identifies the build engine (GitHub Actions runner, workflow SHA, run ID).
- **Invocation**: Records entry point workflow, triggers, inputs, and build parameters.
- **Materials**: Cryptographic commit SHAs of source repository, locked dependency manifests (`package-lock.json`, `gradle.lockfile`), and base container image digests (`@sha256:...`).
- **Artifact Hashes**: SHA-256 digests of resulting production container images (`lifeos-web:<tag>`, `lifeos-api:<tag>`).

---

## 7. Continuous CI/CD & Scheduled Monitoring Workflows

### 7.1 Pull Request & Push Workflow (`.github/workflows/lifeos-ci.yml`)
1. **Documentation & Policy Validation**: Verifies docs, dependency locks, CI policies, and exception registry validity.
2. **Secret Scan (`LifeOS / Secret scan`)**: Runs Gitleaks across complete repository history.
3. **Frontend Quality & Audit (`LifeOS / Frontend`)**: Runs locked dependency installation (`npm ci`), test suite, and quality checks.
4. **Backend Quality & Build (`LifeOS / Backend`)**: Runs locked Gradle build, test suite, and OpenAPI validation.
5. **Container Security Scan (`LifeOS / Container scan`)**: Runs Trivy container vulnerability scanner against production images with high/critical exit code enforcement.

### 7.2 Scheduled Nightly Scan Workflow (`.github/workflows/lifeos-ci.yml`)
- Triggered daily at `02:00 UTC` (`0 2 * * *`).
- Executes full dependency, secret, and container vulnerability scans against `develop` and `master` branches.
- Alerts engineering owners immediately upon discovery of newly published zero-day CVEs affecting deployed packages.

---

## 8. Verification & Audit Procedures

### 8.1 Local Security Audit Command
To execute a complete security scan audit locally:

```bash
# Run security scan audit script in dry-run mode
sh life-os/scripts/validate-security-scans.sh --dry-run

# Run SBOM and provenance generator in dry-run mode
sh life-os/scripts/generate-sbom-and-provenance.sh --dry-run
```

### 8.2 Security Checklist for Ticket Signoff
- [x] All `CRITICAL` and `HIGH` vulnerabilities are zero or covered by an active, unexpired documented exception in `scan-exceptions.json`.
- [x] All exceptions have a named owner, valid expiration date ($\le$ 30 days), technical reason, and compensating controls.
- [x] Zero committed secrets detected across full Git history via Gitleaks.
- [x] Container Dockerfiles build unprivileged images with pinned base tags and pass vulnerability audits.
- [x] Software Bill of Materials (SPDX and CycloneDX) generated and validated for all release targets.
- [x] SLSA build provenance attestations generated and verified.
- [x] CI workflow enforces immutable SHA action pins and scheduled nightly security scans.
