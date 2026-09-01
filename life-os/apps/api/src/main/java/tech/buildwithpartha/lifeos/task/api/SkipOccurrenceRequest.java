package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** Request DTO for skipping a specific recurring occurrence. */
public record SkipOccurrenceRequest(
    @NotNull(message = "occurrenceDate must not be null") LocalDate occurrenceDate,
    String reason) {}
