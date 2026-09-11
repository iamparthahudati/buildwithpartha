# LifeOS production container architecture and security specification

- Status: Accepted
- Date: 2026-09-03
- Ticket: [LOS-1603](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-0216](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/gates/ENGINEERING-FOUNDATION-GATE.md), [LOS-1601](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/35-VPS-INVENTORY-AND-HARDENING.md), [LOS-1602](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md)

---

## 1. Executive summary & architectural scope

This specification defines the production container packaging, runtime security hardening, build reproducibility, health monitoring probes, and Software Bill of Materials (SBOM) standards for LifeOS services.

In accordance with [ADR-011](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-011-MAIN-SITE-LIFEOS-BOUNDARY.md) and [docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md), LifeOS services run inside isolated Docker containers behind a Caddy origin proxy on the production VPS. This document establishes multi-stage build contracts for both the Spring Boot API application (`life-os/apps/api/Dockerfile`) and the React/Vite SPA frontend (`life-os/apps/web/Dockerfile`).

---

## 2. Base image inventory & locking policy

All production container images MUST be built using multi-stage builds sourced from officially maintained, minimal, vulnerability-audited, and explicitly version-pinned base images.

| Service | Build Stage Image | Runtime Stage Image | OS Family / Architecture | Rationale |
| --- | --- | --- | --- | --- |
| **Backend API** | `eclipse-temurin:21.0.6_7-jdk-alpine` | `eclipse-temurin:21.0.6_7-jre-alpine` | Alpine Linux x86_64 | Pinned LTS Java 21 runtime, minimal Alpine attack surface (~180MB) |
| **Frontend Web** | `node:22.14.0-alpine` | `nginx:1.27.4-alpine` | Alpine Linux x86_64 | Pinned LTS Node build toolchain & high-performance static Nginx (~30MB) |

### Base Image Rules:
1. **Zero Untagged or `latest` Dependencies**: Floating tags such as `latest`, `alpine`, or `21-jre` are strictly forbidden in production Dockerfiles.
2. **Digest Verification Support**: Container builds support pinning image digests (`@sha256:...`) during release tagging in [LOS-1607](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md).
3. **Weekly Security Audits**: Base image security updates are audited weekly via Dependabot and automated container scans per [DEPENDENCY-POLICY.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/DEPENDENCY-POLICY.md) and [52-DEPENDENCY-SECRET-CONTAINER-SCANS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/52-DEPENDENCY-SECRET-CONTAINER-SCANS.md) ([LOS-1508](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-15-QUALITY-SECURITY.md)).

---

## 3. Least-privilege non-root execution model

To guarantee container isolation and prevent container-breakout escalation to the host:

1. **Dedicated Service Account**:
   - Container processes run as non-root user `lifeos-app` with fixed numeric UID `10001` and GID `10001`.
   - `USER 10001` directive is enforced in both runtime Dockerfiles.
   - User creation directive: `addgroup -g 10001 -S lifeos-app && adduser -u 10001 -S lifeos-app -G lifeos-app`.

2. **Forbidden Root Privileges**:
   - Running container processes as UID 0 (`root`) is strictly prohibited.
   - Standard shell utilities or application entrypoints do not use `sudo` or setuid binaries inside the container.

---

## 4. Container security profile & runtime hardening

Production containers implement defense-in-depth container security controls:

| Security Control | Specification | Implementation Mechanism |
| --- | --- | --- |
| **Read-Only Root Filesystem** | `read_only: true` | Container root `/` filesystem is mounted read-only at runtime. Ephemeral writes are restricted to explicit `tmpfs` mounts. |
| **Tmpfs Storage Volumes** | `/tmp` (API) & `/tmp`, `/var/cache/nginx`, `/var/run` (Web) | Mounted as isolated, memory-backed `tmpfs` volumes with `noexec,nosuid,nodev` flags. |
| **Capability Dropping** | `cap_drop: ALL` | Drops all Linux kernel capabilities. Neither container requires elevated privileges like `NET_ADMIN` or `SYS_ADMIN`. |
| **Privilege Escalation Block** | `no-new-privileges: true` | Prevents child processes from gaining additional privileges via setuid/setgid binaries. |
| **Non-Privileged Ports** | `EXPOSE 8080` | Services bind strictly to non-privileged ports (`8080`). Privileged port binding (<1024) is forbidden inside containers. |

---

## 5. Health checks & readiness probes

Containers include native `HEALTHCHECK` instructions to allow Docker Engine and system monitors to detect runtime unresponsiveness or crash loops.

| Container | Probe Endpoint | Command | Interval / Timeout / Retries |
| --- | --- | --- | --- |
| **API Container** | `http://127.0.0.1:8080/life-os/api/v1/actuator/health` | `wget --quiet --tries=1 --spider http://127.0.0.1:8080/life-os/api/v1/actuator/health \|\| exit 1` | 30s interval, 5s timeout, 40s start period, 3 retries |
| **Web Container** | `http://127.0.0.1:8080/healthz` | `wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz \|\| exit 1` | 30s interval, 5s timeout, 10s start period, 3 retries |

### Health Check Policy:
- Actuator health endpoint returns HTTP 200 with status `UP` when application context and database connectivity are healthy.
- Unhealthy state (`DOWN` or timeout) triggers container restart policies under Docker Compose (LOS-1604).

---

## 6. Resource allocation & limits (VPS Profile)

To prevent resource exhaustion on the 4GB VPS host ([docs/35-VPS-INVENTORY-AND-HARDENING.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/35-VPS-INVENTORY-AND-HARDENING.md)):

```yaml
# Target Resource Boundaries (Enforced in Docker Compose LOS-1604)
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1.50'
          memory: 1536M
        reservations:
          cpus: '0.25'
          memory: 512M

  web:
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 256M
        reservations:
          cpus: '0.05'
          memory: 64M
```

---

## 7. Software Bill of Materials (SBOM) & reproducible builds

### Reproducible Build Guarantees:
1. **Backend API**:
   - Built using deterministic Gradle bootJar packaging (`./gradlew bootJar --no-daemon -x test`).
   - Dependency versions locked strictly via `gradle.lockfile` (`LockMode.STRICT`).
2. **Frontend Web**:
   - Built using locked npm packages (`npm ci`) matching `package-lock.json` v3.
   - Vite bundling executes with explicit `VITE_BASE=/life-os/`.

### SBOM Generation Contract:
- SBOM artifacts in SPDX and CycloneDX format are generated during release pipeline execution ([LOS-1607](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)) using `syft` or Docker Buildx SBOM attestations:
  ```bash
  # Example SBOM generation command
  syft dir:life-os/apps/api -o spdx-json=life-os-api-sbom.json
  syft dir:life-os/apps/web -o spdx-json=life-os-web-sbom.json
  ```
- Generated SBOM json files are archived alongside release tags and container scan artifacts.

---

## 8. Automated verification

Compliance with this container specification is verified locally and in CI via:
`sh life-os/scripts/validate-container-builds.sh --dry-run`

The script enforces static assertions for:
1. Existence of API Dockerfile, Web Dockerfile, and Nginx configuration.
2. Multi-stage build structure (`FROM ... AS ...`).
3. Explicit base image version pinning (no `:latest` tags).
4. Non-root user declaration (`USER 10001` / `lifeos-app`).
5. Native `HEALTHCHECK` directive presence.
6. Non-privileged port exposure (`EXPOSE 8080`).
7. Nginx SPA fallback and `/healthz` probe configuration.
8. Read-only filesystem and tmpfs compatibility.
