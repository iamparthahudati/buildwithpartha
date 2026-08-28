package tech.buildwithpartha.lifeos.timeblock.application;

import java.time.Instant;

/** Command parameters for resizing a TimeBlock duration. */
public record ResizeTimeBlockCommand(
    Instant startAt, Instant endAt, long version, boolean allowOverlap) {}
