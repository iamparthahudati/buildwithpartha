# LifeOS dependency policy

Ticket: LOS-0203

LifeOS dependency changes are deliberate, reviewable work. Application tickets consume the committed dependency state; they do not update platforms, build tools, direct packages or transitive graphs as incidental cleanup.

## Locked surfaces

| Surface | Source of declared versions | Reproducible resolution contract |
| --- | --- | --- |
| Web application | Exact versions in `apps/web/package.json` | npm lockfile v3; install with `npm ci` |
| Web package manager | Exact `packageManager` field in `apps/web/package.json` | Update together with the web lockfile in a dependency ticket |
| API plugins and platform | Exact plugin versions in `apps/api/build.gradle.kts` | Spring Boot dependency management plus strict Gradle dependency locking |
| API direct/transitive modules | Gradle declarations and Spring Boot managed versions | Committed `apps/api/gradle.lockfile`; normal resolution fails on drift |
| API build tool | Gradle wrapper properties and wrapper JAR | Exact distribution URL plus published SHA-256 checksum |
| Local infrastructure image | Exact patch and base-distribution tag in `infra/compose/compose.local.yml` | Weekly Docker update proposal plus Compose configuration test |
| Runtime families | Node 22.12+, Java 21 | Major/runtime changes require a dedicated architecture decision and dependency ticket |

No wildcard, range, caret, tilde, `latest`, changing module or snapshot version is allowed in a production dependency declaration. Generated lockfiles and wrapper binaries are reviewed, committed and never edited by hand.

## Normal update cadence

Dependabot checks the isolated LifeOS npm, Gradle and local Compose directories every Monday in `Asia/Kolkata` and proposes changes against `develop`. Minor and patch application updates are grouped per ecosystem; major and container-image changes remain separately visible for explicit compatibility and architecture review. Automation may open a proposal but cannot merge or deploy it.

A Dependabot branch is a triage proposal, not a workflow exception: open a LOS ticket, reproduce the accepted update on its `feature/LOS-####-*` branch, and close the bot proposal. The resulting reviewed commit keeps the required LOS ticket reference.

Every accepted update uses its own LOS ticket and feature branch, states why the update is needed, reviews release notes and licensing, refreshes only the relevant generated lock state, and runs the complete affected build/tests. Platform majors, Java/Node runtime-family changes, database drivers with migration risk, Spring Boot upgrades and build-tool majors require an ADR before adoption.

Update commands:

```bash
cd life-os/apps/web
npm install --package-lock-only
npm ci
npm run verify:dependencies
npm test

cd ../api
./gradlew resolveAndLockAll --write-locks
./gradlew clean test bootJar
```

Selective Gradle updates may use `--update-locks group:module`; the resulting complete lockfile diff must still be reviewed. The cross-stack validator is `node life-os/scripts/validate-dependency-locks.mjs` from the repository root.

## Security override path

An actionable security advisory does not wait for Monday. The engineering owner immediately creates a dedicated security ticket and branches from `develop`; if a released production version is affected and waiting for normal integration would materially extend exposure, use an explicitly documented hotfix branch from `master`, then merge the fix back into `develop`.

The security change must:

1. record the advisory identifier, affected deployed versions, exploitability and severity without copying secrets or private incident data;
2. choose the smallest supported fixed version and document any temporary mitigation;
3. update the declaration and generated lockfile/wrapper together;
4. run the affected unit, integration and production-build checks plus dependency validation;
5. receive review before merge, except when the owner records an emergency exception and performs retrospective review within one business day;
6. publish through the normal tagged release/rollback process and confirm the vulnerable version is no longer deployed.

Security urgency changes cadence, not evidence requirements. Dependabot alerts and security updates must be enabled in repository settings once the remote repository is connected. Broader scheduled scanning, severity gates, allowlist expiry, SBOM and provenance remain owned by LOS-1508.

## Review and rollback

- A PR that changes a manifest, lockfile, wrapper or runtime version must identify its dedicated dependency/security ticket.
- Reviewers reject unexplained generated churn, new repositories, unpinned sources and unrelated application changes.
- Rollback restores the previous complete manifest/lock/wrapper set; never restore only one member of the set.
- A version is not considered adopted until `develop` passes all relevant checks. It reaches production only through the phase/release flow from `master`.
