# Engineering foundation gate

- Gate ticket: LOS-0216
- Date: 2026-08-17
- Result: Pass for proceeding from Epic 02 to design-system foundations; not a production or deployment approval
- Tested commit: `dd85bff`
- Environment: Darwin arm64, Node 24.16.0, npm 11.13.0, Temurin Java 21.0.11, native PostgreSQL 16.14

## Gate boundary

This gate proves that the engineering foundation through LOS-0215 can be installed, built, tested and started from a fresh clone without relying on workspace-generated files or parent-directory type packages. It does not approve product features, production infrastructure, legal/provider values or deployment to `master`.

The repository's exact local database contract remains PostgreSQL 18.4 through Docker Compose. Docker is not installed on the current Mac, as already documented, so the executable database checks used isolated native PostgreSQL 16.14 clusters. This proves role/migration/application portability but does not claim that the exact container image ran. The PostgreSQL 18.4 Compose commands remain required when Docker becomes available and at later container/deployment gates.

## Fresh-clone evidence

The repository was cloned with `--no-local` from `feature/LOS-0216-engineering-foundation-gate` at `dd85bff`. No existing `node_modules`, Gradle project output, application build output or untracked workspace file was present. The runner completed with a clean tracked worktree after generated ignored output.

Command:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./life-os/scripts/run-foundation-gate.sh
```

| Step | Result | Wall time | Evidence |
| --- | --- | ---: | --- |
| Documentation/policy | Pass | 0 s | 121 Markdown files, 315 unique tickets, no broken links; dependency and CI policy valid; whitespace clean. |
| Locked frontend install | Pass | 2 s | 385 packages installed from the committed lock; npm reported zero vulnerabilities. |
| Frontend gate/build | Pass | 5 s | Format, lint, strict types, module boundaries, 11 Vitest tests, coverage, test build, 9 Node assertions and production build passed. |
| Uncached backend gate/build | Pass | 13 s | All 15 tasks executed: Spotless, Checkstyle, compile, 43 tests, architecture rules, JaCoCo thresholds, JAR and boot JAR. |
| PostgreSQL/Flyway gate | Pass | 9 s | Restricted roles, clean V1 migration, existing-database rerun, pgcrypto and private history access verified. |
| Running stack smoke | Pass | 5 s | Disposable database started; production API JAR readiness returned `UP`; built web preview served `/life-os/app/today`. |
| Total | Pass | 34 s | Runner printed `LifeOS engineering foundation gate passed.` |

The frontend coverage result was 95.83% statements, 100% branches, 88.88% functions and 95.65% lines against the production baseline. The backend line and branch thresholds remained at or above the required 80% through JaCoCo verification.

## Defects found and resolved

| Defect | Cause | Resolution | Regression evidence |
| --- | --- | --- | --- |
| Flyway verifier could not start after LOS-0211 | The standalone migration command did not supply the newly required startup environment keys and deleted its application log during cleanup. | Supply complete safe test-only values and print the final bounded application log on startup failure. | Clean and existing-database migration runs pass. |
| Fresh frontend typecheck failed | `vite.config.ts` used `process.cwd()` without declaring Node types; a package above the warm workspace accidentally supplied them. | Resolve the project root from `import.meta.url`, removing the ambient parent dependency without adding a package. | Fresh `npm ci` followed by strict typecheck and complete frontend gate passes. |

No unresolved application defect remained after the final run.

## Security, privacy and cleanup

- Only documented synthetic credentials, reserved `example.test` identity values and neutral fixtures were used.
- Services bound to isolated loopback ports: PostgreSQL `55434`, API `18080`, web `14173`.
- The smoke runner stops child processes and the PostgreSQL cluster and removes only its uniquely prefixed temporary directory on exit.
- The fresh-clone directories used to collect evidence were moved to the macOS Trash after the run and remain recoverable until Trash is emptied.
- No production data, provider, browser store, persistent Compose volume, VPS, Cloudflare or deployment state was accessed.

## Gate decision

Proceed to `LOS-0301 — Freeze design tokens`. Keep product screens and production release work blocked behind their existing component, identity, feature and launch gates. Re-run the PostgreSQL 18.4 Compose startup when Docker is available; this environment limitation does not block repository-only design-system work.
