package tech.buildwithpartha.lifeos.project.domain;

import java.time.LocalDate;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Query criteria for retrieving projects. */
public record ProjectQuery(
    UUID userId,
    String q,
    Set<ProjectStatus> statuses,
    Set<ProjectPriority> priorities,
    Set<ProjectHealth> healths,
    Set<UUID> labelIds,
    LocalDate deadlineBefore,
    LocalDate deadlineAfter,
    Boolean archived,
    int page,
    int size,
    String sortBy,
    String sortDirection) {
  public ProjectQuery {
    Objects.requireNonNull(userId, "userId must not be null");
    statuses = statuses != null ? Set.copyOf(statuses) : Set.of();
    priorities = priorities != null ? Set.copyOf(priorities) : Set.of();
    healths = healths != null ? Set.copyOf(healths) : Set.of();
    labelIds = labelIds != null ? Set.copyOf(labelIds) : Set.of();
  }
}
