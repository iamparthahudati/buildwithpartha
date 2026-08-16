# LifeOS API

Java 21 + Spring Boot API for LifeOS. The service is independently built beneath `life-os/apps/api` and will be exposed through Caddy at `/life-os/api/v1/`.

## Requirements

- JDK 21
- No system Gradle installation; use the committed wrapper

Confirm that `JAVA_HOME` points to JDK 21 before running the build:

```bash
java -version
./gradlew clean build
./gradlew dependencies
./scripts/verify-flyway-postgres.sh
```

On macOS, a one-command check can select an installed JDK 21 without changing the machine default:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew clean build
```

## Backend quality gate

`./gradlew check` verifies google-java-format through Spotless, Checkstyle static rules, JUnit and AssertJ tests, ArchUnit package boundaries, and JaCoCo line and branch coverage. Both coverage measures must remain at or above 80%.

Apply deterministic Java formatting before committing:

```bash
./gradlew spotlessApply
```

The HTML reports are generated under `build/reports/checkstyle/`, `build/reports/tests/test/`, and `build/reports/jacoco/test/html/`. The reusable PostgreSQL Testcontainers factory is in test support and pins the same PostgreSQL image as local Compose. A test that starts it requires a Docker-compatible runtime; ordinary unit and architecture tests remain self-contained.

## Configuration boundary

Tests use an isolated in-memory database and require no external secret or service. Local PostgreSQL startup, health and reset instructions are in [`infra/compose/README.md`](../../infra/compose/README.md). Running the application outside tests uses the safe local defaults in `.env.example`; the browser-facing same-origin gateway is documented below.

For browser development, keep the API on loopback port `8080` and open LifeOS through `http://localhost:5173/life-os/`. The Vite gateway forwards `/life-os/api/` requests to this service without rewriting the path; browser code must use the relative `/life-os/api/v1` base rather than calling this port directly.

The normal `test` profile disables Flyway because H2 cannot execute PostgreSQL extension SQL. `verify-flyway-postgres.sh` starts an isolated temporary PostgreSQL cluster, applies the forward-only migration to a clean database, applies it again to the already-migrated database, verifies the private history table and required extension, then removes only its temporary cluster.

The generated executable archive is `build/libs/life-os-api.jar`. No product endpoint is introduced by this bootstrap ticket; API health, Problem Details and OpenAPI are owned by LOS-0213/LOS-0214.

Dependency resolution is strict and uses the committed `gradle.lockfile`. Only a dedicated dependency update ticket may refresh it:

```bash
./gradlew resolveAndLockAll --write-locks
./gradlew clean build
```
