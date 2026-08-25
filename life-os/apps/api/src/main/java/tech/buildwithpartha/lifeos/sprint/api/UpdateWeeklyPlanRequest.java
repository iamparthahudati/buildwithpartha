package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateWeeklyPlanRequest(
    @NotNull @Size(max = 7) List<@Valid WeeklyPlanCapacityRequest> capacities,
    @NotNull @Size(max = 20) List<@Valid WeeklyPlanOutcomeRequest> outcomes,
    @NotNull @Size(max = 500) List<@Valid WeeklyPlanItemRequest> items,
    @Min(0) long version) {}
