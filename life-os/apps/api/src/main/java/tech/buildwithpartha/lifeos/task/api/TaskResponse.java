package tech.buildwithpartha.lifeos.task.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

public record TaskResponse(
    UUID id,
    UUID userId,
    UUID projectId,
    String title,
    String description,
    TaskStatus status,
    TaskPriority priority,
    Instant dueAt,
    int estimateMinutes,
    int spentMinutes,
    int progress,
    LocalDate mitDate,
    int position,
    boolean overdue,
    boolean archived,
    boolean deleted,
    Instant archivedAt,
    Instant deletedAt,
    Instant createdAt,
    Instant updatedAt,
    List<SubtaskResponse> subtasks,
    int subtaskCount,
    int completedSubtaskCount,
    Set<UUID> labelIds,
    long version) {

  public static TaskResponse fromDomain(Task task) {
    return fromDomain(task, Instant.now());
  }

  public static TaskResponse fromDomain(Task task, Instant now) {
    List<SubtaskResponse> subtaskResponses =
        task.subtasks().stream().map(SubtaskResponse::fromDomain).toList();
    int totalSubtasks = subtaskResponses.size();
    int completedSubtasks =
        (int) subtaskResponses.stream().filter(SubtaskResponse::completed).count();

    return new TaskResponse(
        task.id(),
        task.userId(),
        task.projectId().orElse(null),
        task.title(),
        task.description().orElse(null),
        task.status(),
        task.priority(),
        task.dueAt().orElse(null),
        task.estimateMinutes(),
        task.spentMinutes(),
        task.progress(),
        task.mitDate().orElse(null),
        task.position(),
        task.isOverdue(now),
        task.isArchived(),
        task.isDeleted(),
        task.archivedAt().orElse(null),
        task.deletedAt().orElse(null),
        task.createdAt(),
        task.updatedAt(),
        subtaskResponses,
        totalSubtasks,
        completedSubtasks,
        task.labelIds(),
        task.version());
  }
}
