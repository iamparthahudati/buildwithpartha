package tech.buildwithpartha.lifeos.sprint.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public record SprintTask(
    UUID id,
    UUID taskId,
    int storyPoints,
    int position,
    boolean addedAfterStart,
    Instant committedAt,
    Optional<Instant> removedAt,
    Optional<UUID> carriedOverToSprintId) {
  public SprintTask {
    Objects.requireNonNull(id);
    Objects.requireNonNull(taskId);
    Objects.requireNonNull(committedAt);
    Objects.requireNonNull(removedAt);
    Objects.requireNonNull(carriedOverToSprintId);
    if (storyPoints < 0) {
      throw new IllegalArgumentException("Story points must not be negative");
    }
  }

  public boolean active() {
    return removedAt.isEmpty();
  }

  public SprintTask withPlanning(int points, int newPosition) {
    return new SprintTask(
        id,
        taskId,
        points,
        newPosition,
        addedAfterStart,
        committedAt,
        removedAt,
        carriedOverToSprintId);
  }

  public SprintTask remove(Instant at) {
    return new SprintTask(
        id,
        taskId,
        storyPoints,
        position,
        addedAfterStart,
        committedAt,
        Optional.of(at),
        carriedOverToSprintId);
  }

  public SprintTask carryOver(UUID targetId) {
    return new SprintTask(
        id,
        taskId,
        storyPoints,
        position,
        addedAfterStart,
        committedAt,
        removedAt,
        Optional.of(targetId));
  }
}
