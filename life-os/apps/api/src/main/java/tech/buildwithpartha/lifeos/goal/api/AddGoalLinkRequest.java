package tech.buildwithpartha.lifeos.goal.api;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkTargetType;

/** Request DTO for linking a Goal to a target entity. */
public record AddGoalLinkRequest(
    @NotNull(message = "targetType is required") GoalLinkTargetType targetType,
    @NotNull(message = "targetId is required") UUID targetId) {}
