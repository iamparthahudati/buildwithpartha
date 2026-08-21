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
    int page,
    int size,
    String sortBy,
    String sortDirection) {}
