package tech.buildwithpartha.lifeos.project.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Immutable domain record representing a Milestone checkpoint. */
public record Milestone(
    UUID id,
    UUID projectId,
    String title,
    Optional<LocalDate> date,
    MilestoneStatus status,
    int ordering,
    Instant createdAt,
    Instant updatedAt,
    long version) {
  public Milestone {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(projectId, "projectId must not be null");
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(date, "date must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
  }
}
