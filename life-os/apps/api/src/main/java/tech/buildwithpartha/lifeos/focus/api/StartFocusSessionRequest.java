package tech.buildwithpartha.lifeos.focus.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Request body for starting a Focus Session from optional Task/Time Block context. */
public record StartFocusSessionRequest(
    UUID taskId,
    UUID timeBlockId,
    @NotNull @Min(1) @Max(86_400) Long plannedFocusDurationSeconds,
    @NotNull @Min(0) @Max(28_800) Long plannedBreakDurationSeconds) {}
