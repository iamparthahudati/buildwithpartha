package tech.buildwithpartha.lifeos.timeblock.api;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;

/** Request payload for resizing a TimeBlock duration. */
public record ResizeTimeBlockRequest(
    @NotNull Instant startAt,
    @NotNull Instant endAt,
    @NotNull Long version,
    Boolean allowOverlap) {}
