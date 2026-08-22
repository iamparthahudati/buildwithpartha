package tech.buildwithpartha.lifeos.task.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Immutable domain record representing a directed task dependency (blockingTaskId ->
 * blockedTaskId).
 */
public record TaskDependency(UUID blockingTaskId, UUID blockedTaskId, Instant createdAt) {

  public TaskDependency {
    Objects.requireNonNull(blockingTaskId, "blockingTaskId must not be null");
    Objects.requireNonNull(blockedTaskId, "blockedTaskId must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");

    if (blockingTaskId.equals(blockedTaskId)) {
      throw new IllegalArgumentException("Task cannot depend on itself");
    }
  }
}
