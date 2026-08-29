package tech.buildwithpartha.lifeos.project.application;

import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;

/** Command payload for updating an existing Project. */
public record UpdateProjectCommand(
    String name,
    String description,
    ProjectStatus status,
    ProjectPriority priority,
    ProjectHealth health,
    String color,
    String icon,
    String coverImageUrl,
    LocalDate startDate,
    LocalDate deadlineDate,
    Integer estimateMinutes,
    Set<UUID> labelIds,
    long version) {}
