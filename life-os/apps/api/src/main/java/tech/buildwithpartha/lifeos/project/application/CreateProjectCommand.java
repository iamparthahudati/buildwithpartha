package tech.buildwithpartha.lifeos.project.application;

import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;

/** Command payload for creating a new Project. */
public record CreateProjectCommand(
    String name,
    String description,
    ProjectStatus status,
    ProjectPriority priority,
    ProjectHealth health,
    String color,
    String icon,
    LocalDate startDate,
    LocalDate deadlineDate,
    Integer estimateMinutes,
    Set<UUID> labelIds) {}
