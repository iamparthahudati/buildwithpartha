package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record WeeklyPlanCapacityRequest(
    @NotNull LocalDate localDate, @Min(0) @Max(1440) int availableMinutes) {}
