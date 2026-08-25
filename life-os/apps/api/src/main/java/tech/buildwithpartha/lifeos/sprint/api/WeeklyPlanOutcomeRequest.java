package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record WeeklyPlanOutcomeRequest(
    UUID id, @NotBlank @Size(max = 200) String title, int position) {}
