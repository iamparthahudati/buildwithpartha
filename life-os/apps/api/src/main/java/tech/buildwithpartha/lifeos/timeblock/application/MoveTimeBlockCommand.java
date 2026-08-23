package tech.buildwithpartha.lifeos.timeblock.application;

import java.time.Instant;

/** Command parameters for moving a TimeBlock interval. */
public record MoveTimeBlockCommand(
    Instant startAt, Instant endAt, long version, boolean allowOverlap) {}
