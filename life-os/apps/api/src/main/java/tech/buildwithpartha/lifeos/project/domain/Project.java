package tech.buildwithpartha.lifeos.project.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Immutable domain record representing a Project with validation invariants. */
public record Project(
    UUID id,
    UUID userId,
    String name,
    Optional<String> description,
    ProjectStatus status,
    ProjectPriority priority,
    ProjectHealth health,
    Optional<String> color,
    Optional<String> icon,
    Optional<LocalDate> startDate,
    Optional<LocalDate> deadlineDate,
    Optional<Integer> estimateMinutes,
    Optional<Instant> archivedAt,
    Instant createdAt,
    Instant updatedAt,
    Set<UUID> labelIds,
    long version) {
  public Project {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(name, "name must not be null");
    Objects.requireNonNull(description, "description must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(priority, "priority must not be null");
    Objects.requireNonNull(health, "health must not be null");
    Objects.requireNonNull(color, "color must not be null");
    Objects.requireNonNull(icon, "icon must not be null");
    Objects.requireNonNull(startDate, "startDate must not be null");
    Objects.requireNonNull(deadlineDate, "deadlineDate must not be null");
    Objects.requireNonNull(estimateMinutes, "estimateMinutes must not be null");
    Objects.requireNonNull(archivedAt, "archivedAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    Objects.requireNonNull(labelIds, "labelIds must not be null");

    if (startDate.isPresent()
        && deadlineDate.isPresent()
        && deadlineDate.get().isBefore(startDate.get())) {
      throw new IllegalArgumentException("Deadline date cannot precede start date");
    }
    if (estimateMinutes.isPresent() && estimateMinutes.get() < 0) {
      throw new IllegalArgumentException("Estimate minutes must not be negative");
    }
  }
}
