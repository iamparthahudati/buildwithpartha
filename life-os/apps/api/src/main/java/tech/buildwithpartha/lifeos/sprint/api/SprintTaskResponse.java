package tech.buildwithpartha.lifeos.sprint.api;

import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.domain.SprintTask;

public record SprintTaskResponse(
    UUID id,
    UUID taskId,
    int storyPoints,
    int position,
    boolean addedAfterStart,
    Instant committedAt,
    Instant removedAt,
    UUID carriedOverToSprintId) {
  static SprintTaskResponse fromDomain(SprintTask task) {
    return new SprintTaskResponse(
        task.id(),
        task.taskId(),
        task.storyPoints(),
        task.position(),
        task.addedAfterStart(),
        task.committedAt(),
        task.removedAt().orElse(null),
        task.carriedOverToSprintId().orElse(null));
  }
}
