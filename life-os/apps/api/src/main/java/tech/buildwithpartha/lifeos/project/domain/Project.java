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
    Optional<String> coverImageUrl,
    Optional<LocalDate> startDate,
    Optional<LocalDate> deadlineDate,
    Optional<Integer> estimateMinutes,
    Optional<Instant> archivedAt,
    Instant createdAt,
    Instant updatedAt,
    Set<UUID> labelIds,
    long version) {
  /**
   * Maximum stored length of a cover image URL/path, aligned with the database check constraint.
   */
  public static final int MAX_COVER_IMAGE_URL_LENGTH = 2048;

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
    Objects.requireNonNull(coverImageUrl, "coverImageUrl must not be null");
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
    if (coverImageUrl.isPresent() && coverImageUrl.get().length() > MAX_COVER_IMAGE_URL_LENGTH) {
      throw new IllegalArgumentException(
          "Cover image URL must not exceed " + MAX_COVER_IMAGE_URL_LENGTH + " characters");
    }
  }

  public Project withUpdates(
      String newName,
      Optional<String> newDescription,
      ProjectStatus newStatus,
      ProjectPriority newPriority,
      ProjectHealth newHealth,
      Optional<String> newColor,
      Optional<String> newIcon,
      Optional<String> newCoverImageUrl,
      Optional<LocalDate> newStartDate,
      Optional<LocalDate> newDeadlineDate,
      Optional<Integer> newEstimateMinutes,
      Set<UUID> newLabelIds,
      Instant newUpdatedAt) {
    return new Project(
        id,
        userId,
        newName != null ? newName : name,
        newDescription != null ? newDescription : description,
        newStatus != null ? newStatus : status,
        newPriority != null ? newPriority : priority,
        newHealth != null ? newHealth : health,
        newColor != null ? newColor : color,
        newIcon != null ? newIcon : icon,
        newCoverImageUrl != null ? newCoverImageUrl : coverImageUrl,
        newStartDate != null ? newStartDate : startDate,
        newDeadlineDate != null ? newDeadlineDate : deadlineDate,
        newEstimateMinutes != null ? newEstimateMinutes : estimateMinutes,
        archivedAt,
        createdAt,
        newUpdatedAt,
        newLabelIds != null ? newLabelIds : labelIds,
        version);
  }

  public Project archive(Instant archivedAtInstant, Instant newUpdatedAt) {
    return new Project(
        id,
        userId,
        name,
        description,
        status,
        priority,
        health,
        color,
        icon,
        coverImageUrl,
        startDate,
        deadlineDate,
        estimateMinutes,
        Optional.of(archivedAtInstant),
        createdAt,
        newUpdatedAt,
        labelIds,
        version);
  }

  public Project restore(Instant newUpdatedAt) {
    return new Project(
        id,
        userId,
        name,
        description,
        status,
        priority,
        health,
        color,
        icon,
        coverImageUrl,
        startDate,
        deadlineDate,
        estimateMinutes,
        Optional.empty(),
        createdAt,
        newUpdatedAt,
        labelIds,
        version);
  }
}
