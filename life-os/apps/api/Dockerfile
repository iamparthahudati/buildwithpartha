# ==============================================================================
# LifeOS API Spring Boot Production Multi-Stage Dockerfile (LOS-1603)
# ==============================================================================
# Base Image: Pinned Eclipse Temurin Java 21 JDK & JRE Alpine
# Non-Root User: lifeos-app (UID 10001, GID 10001)
# Security Profile: Read-only root filesystem compatible, tmpfs /tmp, drop capabilities
# Healthcheck: Actuator /life-os/api/v1/actuator/health on port 8080
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Stage
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21.0.6_7-jdk-alpine AS builder

WORKDIR /build

# Copy Gradle wrapper and project configuration first for layer caching
COPY gradlew .
COPY gradle/ gradle/
COPY settings.gradle.kts build.gradle.kts gradle.lockfile ./

# Grant execution permission to gradlew
RUN chmod +x gradlew

# Pre-fetch and cache Gradle dependencies using locked configurations
RUN ./gradlew dependencies --no-daemon

# Copy source code and static analysis configurations
COPY src/ src/
COPY config/ config/

# Build reproducible production bootJar without running tests (tests run in CI)
RUN ./gradlew bootJar --no-daemon -x test

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime Stage
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21.0.6_7-jre-alpine AS runner

# Install wget for container health checks and tzdata for UTC time
RUN apk add --no-cache wget tzdata

# Create dedicated non-root user and group
RUN addgroup -g 10001 -S lifeos-app && \
    adduser -u 10001 -S lifeos-app -G lifeos-app

WORKDIR /app

# Create application and temporary directories with non-root ownership
RUN mkdir -p /app /tmp && \
    chown -R lifeos-app:lifeos-app /app /tmp

# Copy built bootJar artifact from builder stage
COPY --from=builder --chown=lifeos-app:lifeos-app /build/build/libs/life-os-api.jar /app/life-os-api.jar

# Switch to non-root user
USER 10001

# Expose non-privileged HTTP port
EXPOSE 8080

# Environment defaults
ENV SERVER_PORT=8080 \
    SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom -Djava.io.tmpdir=/tmp"

# Container health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/life-os/api/v1/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/life-os-api.jar"]
