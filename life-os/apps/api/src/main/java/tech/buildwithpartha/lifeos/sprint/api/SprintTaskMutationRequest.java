package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record SprintTaskMutationRequest(
    @Min(0) int storyPoints,
    int position,
    @Size(max = 1000) String reason,
    @PositiveOrZero long version) {}
