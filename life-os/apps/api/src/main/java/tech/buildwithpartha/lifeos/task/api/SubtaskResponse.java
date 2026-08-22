package tech.buildwithpartha.lifeos.task.api;

import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.Subtask;

public record SubtaskResponse(
    UUID id,
    UUID taskId,
    String title,
    boolean completed,
    int position,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static SubtaskResponse fromDomain(Subtask subtask) {
    return new SubtaskResponse(
        subtask.id(),
        subtask.taskId(),
        subtask.title(),
        subtask.completed(),
        subtask.position(),
        subtask.createdAt(),
        subtask.updatedAt(),
        subtask.version());
  }
}
