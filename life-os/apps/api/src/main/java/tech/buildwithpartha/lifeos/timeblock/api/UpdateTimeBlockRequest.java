package tech.buildwithpartha.lifeos.timeblock.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** Request payload for updating a TimeBlock. */
public record UpdateTimeBlockRequest(
    @NotBlank String title,
    @NotBlank String category,
    @NotNull TimeBlockStatus status,
    @NotNull Instant startAt,
    @NotNull Instant endAt,
    @NotBlank String sourceTimeZone,
    String notes,
    UUID projectId,
    UUID taskId,
    @NotNull Long version,
    Boolean allowOverlap) {}
