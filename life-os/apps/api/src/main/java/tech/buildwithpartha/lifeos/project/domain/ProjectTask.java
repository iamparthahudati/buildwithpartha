package tech.buildwithpartha.lifeos.project.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Immutable domain record representing a task's progress state from the project's viewpoint. */
public record ProjectTask(
    UUID id,
    ProjectTaskStatus status,
    int estimateMinutes,
    Optional<Instant> dueAt,
    boolean archived) {

  public ProjectTask {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(dueAt, "dueAt must not be null");

    if (estimateMinutes < 0) {
      throw new IllegalArgumentException("estimateMinutes must not be negative");
    }
  }

  public static ProjectTask fromStatusName(
      UUID id, String statusName, int estimateMinutes, Optional<Instant> dueAt, boolean archived) {
    Objects.requireNonNull(statusName, "statusName must not be null");
    return new ProjectTask(
        id, ProjectTaskStatus.valueOf(statusName), estimateMinutes, dueAt, archived);
  }

  public boolean isCancelled() {
    return status == ProjectTaskStatus.CANCELLED;
  }

  public boolean isDone() {
    return status == ProjectTaskStatus.DONE;
  }

  public boolean isBlocked() {
    return status == ProjectTaskStatus.BLOCKED;
  }

  public boolean isOverdue(Instant now) {
    Objects.requireNonNull(now, "now must not be null");
    if (isDone() || isCancelled() || archived) {
      return false;
    }
    return dueAt.isPresent() && dueAt.get().isBefore(now);
  }
}
