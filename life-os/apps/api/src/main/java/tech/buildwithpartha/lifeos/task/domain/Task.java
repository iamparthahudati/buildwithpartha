package tech.buildwithpartha.lifeos.task.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Immutable domain record representing a Task aggregate with invariants. */
public record Task(
    UUID id,
    UUID userId,
    Optional<UUID> projectId,
    String title,
    Optional<String> description,
    TaskStatus status,
    TaskPriority priority,
    Optional<Instant> dueAt,
    int estimateMinutes,
    int spentMinutes,
    int progress,
    Optional<LocalDate> mitDate,
    int position,
    Optional<Instant> archivedAt,
    Optional<Instant> deletedAt,
    Instant createdAt,
    Instant updatedAt,
    List<Subtask> subtasks,
    Set<UUID> labelIds,
    long version) {

  public Task {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(projectId, "projectId must not be null");
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(description, "description must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(priority, "priority must not be null");
    Objects.requireNonNull(dueAt, "dueAt must not be null");
    Objects.requireNonNull(mitDate, "mitDate must not be null");
    Objects.requireNonNull(archivedAt, "archivedAt must not be null");
    Objects.requireNonNull(deletedAt, "deletedAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    Objects.requireNonNull(subtasks, "subtasks must not be null");
    Objects.requireNonNull(labelIds, "labelIds must not be null");

    if (title.isBlank()) {
      throw new IllegalArgumentException("Task title must not be blank");
    }
    if (estimateMinutes < 0) {
      throw new IllegalArgumentException("Estimate minutes must not be negative");
    }
    if (spentMinutes < 0) {
      throw new IllegalArgumentException("Spent minutes must not be negative");
    }
    if (progress < 0 || progress > 100) {
      throw new IllegalArgumentException("Progress must be between 0 and 100");
    }

    subtasks = List.copyOf(subtasks);
    labelIds = Set.copyOf(labelIds);
  }

  public Task(
      UUID id,
      UUID userId,
      Optional<UUID> projectId,
      String title,
      Optional<String> description,
      TaskStatus status,
      TaskPriority priority,
      Optional<Instant> dueAt,
      int estimateMinutes,
      int spentMinutes,
      int progress,
      Optional<LocalDate> mitDate,
      int position,
      Optional<Instant> archivedAt,
      Optional<Instant> deletedAt,
      Instant createdAt,
      Instant updatedAt,
      List<Subtask> subtasks,
      long version) {
    this(
        id,
        userId,
        projectId,
        title,
        description,
        status,
        priority,
        dueAt,
        estimateMinutes,
        spentMinutes,
        progress,
        mitDate,
        position,
        archivedAt,
        deletedAt,
        createdAt,
        updatedAt,
        subtasks,
        Set.of(),
        version);
  }

  public boolean isArchived() {

    return archivedAt.isPresent();
  }

  public boolean isDeleted() {
    return deletedAt.isPresent();
  }

  public boolean isOverdue(Instant now) {
    Objects.requireNonNull(now, "now must not be null");
    if (status.isTerminal() || isArchived() || isDeleted()) {
      return false;
    }
    return dueAt.isPresent() && dueAt.get().isBefore(now);
  }

  public Task withUpdates(
      Optional<UUID> newProjectId,
      String newTitle,
      Optional<String> newDescription,
      TaskStatus newStatus,
      TaskPriority newPriority,
      Optional<Instant> newDueAt,
      Integer newEstimateMinutes,
      Integer newSpentMinutes,
      Integer newProgress,
      Optional<LocalDate> newMitDate,
      Integer newPosition,
      Instant newUpdatedAt) {
    return withUpdates(
        newProjectId,
        newTitle,
        newDescription,
        newStatus,
        newPriority,
        newDueAt,
        newEstimateMinutes,
        newSpentMinutes,
        newProgress,
        newMitDate,
        newPosition,
        labelIds,
        newUpdatedAt);
  }

  public Task withUpdates(
      Optional<UUID> newProjectId,
      String newTitle,
      Optional<String> newDescription,
      TaskStatus newStatus,
      TaskPriority newPriority,
      Optional<Instant> newDueAt,
      Integer newEstimateMinutes,
      Integer newSpentMinutes,
      Integer newProgress,
      Optional<LocalDate> newMitDate,
      Integer newPosition,
      Set<UUID> newLabelIds,
      Instant newUpdatedAt) {

    return new Task(
        id,
        userId,
        newProjectId != null ? newProjectId : projectId,
        newTitle != null ? newTitle : title,
        newDescription != null ? newDescription : description,
        newStatus != null ? newStatus : status,
        newPriority != null ? newPriority : priority,
        newDueAt != null ? newDueAt : dueAt,
        newEstimateMinutes != null ? newEstimateMinutes : estimateMinutes,
        newSpentMinutes != null ? newSpentMinutes : spentMinutes,
        newProgress != null ? newProgress : progress,
        newMitDate != null ? newMitDate : mitDate,
        newPosition != null ? newPosition : position,
        archivedAt,
        deletedAt,
        createdAt,
        newUpdatedAt,
        subtasks,
        newLabelIds != null ? newLabelIds : labelIds,
        version);
  }

  public Task archive(Instant archivedAtInstant, Instant newUpdatedAt) {
    return new Task(
        id,
        userId,
        projectId,
        title,
        description,
        status,
        priority,
        dueAt,
        estimateMinutes,
        spentMinutes,
        progress,
        mitDate,
        position,
        Optional.of(archivedAtInstant),
        deletedAt,
        createdAt,
        newUpdatedAt,
        subtasks,
        labelIds,
        version);
  }

  public Task restore(Instant newUpdatedAt) {
    return new Task(
        id,
        userId,
        projectId,
        title,
        description,
        status,
        priority,
        dueAt,
        estimateMinutes,
        spentMinutes,
        progress,
        mitDate,
        position,
        Optional.empty(),
        deletedAt,
        createdAt,
        newUpdatedAt,
        subtasks,
        labelIds,
        version);
  }

  public Task softDelete(Instant deletedAtInstant, Instant newUpdatedAt) {
    return new Task(
        id,
        userId,
        projectId,
        title,
        description,
        status,
        priority,
        dueAt,
        estimateMinutes,
        spentMinutes,
        progress,
        mitDate,
        position,
        archivedAt,
        Optional.of(deletedAtInstant),
        createdAt,
        newUpdatedAt,
        subtasks,
        labelIds,
        version);
  }

  public Task withSubtasks(List<Subtask> newSubtasks, Instant newUpdatedAt) {
    return new Task(
        id,
        userId,
        projectId,
        title,
        description,
        status,
        priority,
        dueAt,
        estimateMinutes,
        spentMinutes,
        progress,
        mitDate,
        position,
        archivedAt,
        deletedAt,
        createdAt,
        newUpdatedAt,
        newSubtasks,
        labelIds,
        version);
  }

  public Task duplicate(UUID newId, String newTitle, Instant now) {
    Objects.requireNonNull(newId, "newId must not be null");
    Objects.requireNonNull(now, "now must not be null");
    String effectiveTitle =
        (newTitle != null && !newTitle.isBlank()) ? newTitle.trim() : "Copy of " + title;

    List<Subtask> duplicatedSubtasks =
        subtasks.stream()
            .map(
                s ->
                    new Subtask(
                        UUID.randomUUID(), newId, s.title(), false, s.position(), now, now, 0L))
            .toList();

    return new Task(
        newId,
        userId,
        projectId,
        effectiveTitle,
        description,
        TaskStatus.TO_DO,
        priority,
        dueAt,
        estimateMinutes,
        0,
        0,
        Optional.empty(),
        position,
        Optional.empty(),
        Optional.empty(),
        now,
        now,
        duplicatedSubtasks,
        labelIds,
        0L);
  }
}
