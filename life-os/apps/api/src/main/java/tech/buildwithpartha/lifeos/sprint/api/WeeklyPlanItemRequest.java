package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record WeeklyPlanItemRequest(
    UUID id,
    @NotNull UUID taskId,
    UUID outcomeId,
    LocalDate plannedDate,
    @Min(0) @Max(1440) int plannedMinutes,
    int position) {}
