package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.PositiveOrZero;

public record SprintVersionRequest(@PositiveOrZero long version) {}
