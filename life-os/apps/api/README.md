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
```

On macOS, a one-command check can select an installed JDK 21 without changing the machine default:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew test
```

## Configuration boundary

Tests use an isolated in-memory database and require no external secret or service. Running the application outside tests expects the non-secret and secret environment values listed in `.env.example`; PostgreSQL and full local-stack behavior arrive in LOS-0204/LOS-0210.

The generated executable archive is `build/libs/life-os-api.jar`. No product endpoint is introduced by this bootstrap ticket; API health, Problem Details and OpenAPI are owned by LOS-0213/LOS-0214.

Dependency resolution is strict and uses the committed `gradle.lockfile`. Only a dedicated dependency update ticket may refresh it:

```bash
./gradlew resolveAndLockAll --write-locks
./gradlew clean test bootJar
```
