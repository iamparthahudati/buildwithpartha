package tech.buildwithpartha.lifeos.timeblock.api;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;

/** Request payload for moving a TimeBlock interval. */
public record MoveTimeBlockRequest(
    @NotNull Instant startAt,
    @NotNull Instant endAt,
    @NotNull Long version,
    Boolean allowOverlap) {}
