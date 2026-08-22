package tech.buildwithpartha.lifeos.project.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import tech.buildwithpartha.lifeos.project.domain.Milestone;

/** Response DTO representing a Milestone. */
public record MilestoneResponse(
    UUID id,
    UUID projectId,
    String title,
    LocalDate date,
    String status,
    int ordering,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static MilestoneResponse fromDomain(Milestone milestone) {
    return new MilestoneResponse(
        milestone.id(),
        milestone.projectId(),
        milestone.title(),
        milestone.date().orElse(null),
        milestone.status().name(),
        milestone.ordering(),
        milestone.createdAt(),
        milestone.updatedAt(),
        milestone.version());
  }
}
