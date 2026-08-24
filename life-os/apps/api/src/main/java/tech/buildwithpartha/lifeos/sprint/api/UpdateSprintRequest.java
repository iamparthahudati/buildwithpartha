package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdateSprintRequest(
    @NotBlank @Size(max = 200) String name,
    @Size(max = 2000) String goal,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    @Min(0) int targetCapacityPoints,
    @PositiveOrZero long version) {}
