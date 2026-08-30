package tech.buildwithpartha.lifeos.task.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Immutable record assigning one task to one project milestone (LOS-0826). */
public record TaskMilestoneAssignment(
    UUID taskId,
    UUID userId,
    UUID milestoneId,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public TaskMilestoneAssignment {
    Objects.requireNonNull(taskId, "taskId must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(milestoneId, "milestoneId must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
  }

  public TaskMilestoneAssignment withMilestone(UUID newMilestoneId, Instant newUpdatedAt) {
    return new TaskMilestoneAssignment(
        taskId, userId, newMilestoneId, createdAt, newUpdatedAt, version);
  }
}
