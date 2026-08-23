package tech.buildwithpartha.lifeos.timeblock.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** Request payload for creating a TimeBlock. */
public record CreateTimeBlockRequest(
    @NotBlank String title,
    @NotBlank String category,
    TimeBlockStatus status,
    @NotNull Instant startAt,
    @NotNull Instant endAt,
    @NotBlank String sourceTimeZone,
    String notes,
    UUID projectId,
    UUID taskId,
    Boolean allowOverlap) {}
