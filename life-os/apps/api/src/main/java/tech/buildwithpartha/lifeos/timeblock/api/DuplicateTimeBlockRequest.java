package tech.buildwithpartha.lifeos.timeblock.api;

import java.time.Instant;

/** Request payload for duplicating a TimeBlock. */
public record DuplicateTimeBlockRequest(Instant startAt, Instant endAt, Boolean allowOverlap) {}
