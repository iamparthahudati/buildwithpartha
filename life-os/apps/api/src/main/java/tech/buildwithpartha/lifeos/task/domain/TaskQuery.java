package tech.buildwithpartha.lifeos.task.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

public record TaskQuery(
    UUID userId,
    String query,
    UUID projectId,
    Set<TaskStatus> statuses,
    Set<TaskPriority> priorities,
    LocalDate mitDate,
    Boolean isMit,
    Boolean overdue,
    Boolean archived,
    Instant dueBefore,
    Instant dueAfter,
    Set<UUID> labelIds,
    int page,
    int size,
    String sortBy,
    String sortDirection) {

  public TaskQuery {
    labelIds = labelIds != null ? Set.copyOf(labelIds) : Set.of();
  }

  public TaskQuery(
      UUID userId,
      String query,
      UUID projectId,
      Set<TaskStatus> statuses,
      Set<TaskPriority> priorities,
      LocalDate mitDate,
      Boolean isMit,
      Boolean overdue,
      Boolean archived,
      Instant dueBefore,
      Instant dueAfter,
      int page,
      int size,
      String sortBy,
      String sortDirection) {
    this(
        userId,
        query,
        projectId,
        statuses,
        priorities,
        mitDate,
        isMit,
        overdue,
        archived,
        dueBefore,
        dueAfter,
        Set.of(),
        page,
        size,
        sortBy,
        sortDirection);
  }
}

