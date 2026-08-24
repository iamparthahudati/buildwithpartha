package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record RemoveSprintTaskRequest(
    @Size(max = 1000) String reason, @PositiveOrZero long version) {}
