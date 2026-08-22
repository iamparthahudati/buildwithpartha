package tech.buildwithpartha.lifeos.project.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.project.domain.Project;

/** Response DTO representing a Project. */
public record ProjectResponse(
    UUID id,
    UUID userId,
    String name,
    String description,
    String status,
    String priority,
    String health,
    String color,
    String icon,
    LocalDate startDate,
    LocalDate deadlineDate,
    Integer estimateMinutes,
    Instant archivedAt,
    Instant createdAt,
    Instant updatedAt,
    Set<UUID> labelIds,
    long version) {

  public static ProjectResponse fromDomain(Project project) {
    return new ProjectResponse(
        project.id(),
        project.userId(),
        project.name(),
        project.description().orElse(null),
        project.status().name(),
        project.priority().name(),
        project.health().name(),
        project.color().orElse(null),
        project.icon().orElse(null),
        project.startDate().orElse(null),
        project.deadlineDate().orElse(null),
        project.estimateMinutes().orElse(null),
        project.archivedAt().orElse(null),
        project.createdAt(),
        project.updatedAt(),
        project.labelIds(),
        project.version());
  }
}
