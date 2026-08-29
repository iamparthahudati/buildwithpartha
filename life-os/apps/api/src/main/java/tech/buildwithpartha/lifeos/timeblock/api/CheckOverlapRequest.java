package tech.buildwithpartha.lifeos.timeblock.api;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

/** Request payload for preflight overlap check. */
public record CheckOverlapRequest(
    @NotNull Instant startAt, @NotNull Instant endAt, UUID excludeId) {}
