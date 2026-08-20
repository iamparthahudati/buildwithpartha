package tech.buildwithpartha.lifeos.task.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Immutable domain record representing a subtask item within a parent task. */
public record Subtask(
    UUID id,
    UUID taskId,
    String title,
    boolean completed,
    int position,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public Subtask {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");

    if (title.isBlank()) {
      throw new IllegalArgumentException("Subtask title must not be blank");
    }
  }

  public Subtask withTitle(String newTitle, Instant newUpdatedAt) {
    return new Subtask(id, taskId, newTitle, completed, position, createdAt, newUpdatedAt, version);
  }

  public Subtask withCompleted(boolean newCompleted, Instant newUpdatedAt) {
    return new Subtask(id, taskId, title, newCompleted, position, createdAt, newUpdatedAt, version);
  }

  public Subtask withPosition(int newPosition, Instant newUpdatedAt) {
    return new Subtask(id, taskId, title, completed, newPosition, createdAt, newUpdatedAt, version);
  }
}
