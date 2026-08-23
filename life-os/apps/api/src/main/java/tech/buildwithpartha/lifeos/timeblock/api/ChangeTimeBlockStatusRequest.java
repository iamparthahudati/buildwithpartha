package tech.buildwithpartha.lifeos.timeblock.api;

import jakarta.validation.constraints.NotNull;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** Request payload for changing a TimeBlock status. */
public record ChangeTimeBlockStatusRequest(@NotNull TimeBlockStatus status, Long version) {}
