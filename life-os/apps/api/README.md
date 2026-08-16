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

The HTML reports are generated under `build/reports/checkstyle/`, `build/reports/tests/test/`, and `build/reports/jacoco/test/html/`. Test support contains a reusable PostgreSQL Testcontainers factory pinned to the local Compose image and deterministic User, Project, Task and time builders. Builder defaults use fixed UUIDs/instants, reserved `example.test` identity data, approved neutral copy and explicit IANA timezone conversion. A test that starts PostgreSQL requires a Docker-compatible runtime; ordinary unit and architecture tests remain self-contained.

## Configuration boundary

Tests use an isolated in-memory database and deterministic test configuration, requiring no external secret or service. Local PostgreSQL startup, health and reset instructions are in [`infra/compose/README.md`](../../infra/compose/README.md). Running the application outside tests requires every non-empty key in `.env.example`; copy or source that safe local example before startup.

The API validates its active profile, port, database application/Flyway credentials, public URL, cookie policy, sender and SMTP endpoint before creating service or persistence beans. Missing, blank or malformed configuration stops startup with the affected key names only. Values—including passwords and URL contents—are never included in validation errors. SMTP username/password remain optional for the local unauthenticated mail catcher; later provider tickets make them required where applicable.

For browser development, keep the API on loopback port `8080` and open LifeOS through `http://localhost:5173/life-os/`. The Vite gateway forwards `/life-os/api/` requests to this service without rewriting the path; browser code must use the relative `/life-os/api/v1` base rather than calling this port directly.

The normal `test` profile disables Flyway because H2 cannot execute PostgreSQL extension SQL. `verify-flyway-postgres.sh` starts an isolated temporary PostgreSQL cluster, applies the forward-only migration to a clean database, applies it again to the already-migrated database, verifies the private history table and required extension, then removes only its temporary cluster.

The generated executable archive is `build/libs/life-os-api.jar`. The only public backend endpoints at this stage are `GET /actuator/health/liveness` and `GET /actuator/health/readiness`; they return aggregate status without component or environment details. Other actuator endpoints are unavailable or denied.

Every HTTP response includes `X-Correlation-ID`. A caller-provided value is reused only when it matches the documented safe format; otherwise the API creates a UUID. API failures use `application/problem+json` and the versioned contract in [`docs/05-API-CONVENTIONS.md`](../../docs/05-API-CONVENTIONS.md). No exception message, rejected field value, stack trace or query string is included. Product endpoints begin in later tickets.

The authenticated OpenAPI 3.1 document is served at `/life-os/api/v1/openapi`; interactive Swagger UI is intentionally disabled. The baseline has no product paths yet and defines the shared `/life-os/api/v1` server, browser session and CSRF schemes, reusable Problem Details responses, and pagination schema. Backend tests validate it and write `build/openapi/life-os-openapi.json`, which the hosted backend check uploads as the `life-os-openapi` artifact for 14 days.

Dependency resolution is strict and uses the committed `gradle.lockfile`. Only a dedicated dependency update ticket may refresh it:

```bash
./gradlew resolveAndLockAll --write-locks
./gradlew clean build
```
