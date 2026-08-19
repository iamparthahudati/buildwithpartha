package tech.buildwithpartha.lifeos.auth.application;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public record SessionDto(
    UUID id,
    Optional<String> deviceHint,
    Instant createdAt,
    Instant lastSeenAt,
    boolean isCurrent) {}
