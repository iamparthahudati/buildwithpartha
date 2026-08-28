package tech.buildwithpartha.lifeos.goal.application;

import java.util.Objects;
import java.util.UUID;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkTargetType;

/** Command carrier for linking a Goal to a target entity (Project, Task, Habit). */
public record AddGoalLinkCommand(GoalLinkTargetType targetType, UUID targetId) {

  public AddGoalLinkCommand {
    Objects.requireNonNull(targetType, "targetType must not be null");
    Objects.requireNonNull(targetId, "targetId must not be null");
  }
}
