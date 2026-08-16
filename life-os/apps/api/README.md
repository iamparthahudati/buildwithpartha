# LifeOS API

Java 21 + Spring Boot API for LifeOS. The service is independently built beneath `life-os/apps/api` and will be exposed through Caddy at `/life-os/api/v1/`.

## Requirements

- JDK 21
- No system Gradle installation; use the committed wrapper

Confirm that `JAVA_HOME` points to JDK 21 before running the build:

```bash
java -version
./gradlew test
./gradlew bootJar
./gradlew dependencies
./scripts/verify-flyway-postgres.sh
```

On macOS, a one-command check can select an installed JDK 21 without changing the machine default:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew test
```

## Configuration boundary

Tests use an isolated in-memory database and require no external secret or service. Local PostgreSQL startup, health and reset instructions are in [`infra/compose/README.md`](../../infra/compose/README.md). Running the application outside tests uses the safe local defaults in `.env.example`; full same-origin local-stack behavior arrives in LOS-0210.

The normal `test` profile disables Flyway because H2 cannot execute PostgreSQL extension SQL. `verify-flyway-postgres.sh` starts an isolated temporary PostgreSQL cluster, applies the forward-only migration to a clean database, applies it again to the already-migrated database, verifies the private history table and required extension, then removes only its temporary cluster.

The generated executable archive is `build/libs/life-os-api.jar`. No product endpoint is introduced by this bootstrap ticket; API health, Problem Details and OpenAPI are owned by LOS-0213/LOS-0214.

Dependency resolution is strict and uses the committed `gradle.lockfile`. Only a dedicated dependency update ticket may refresh it:

```bash
./gradlew resolveAndLockAll --write-locks
./gradlew clean test bootJar
```
