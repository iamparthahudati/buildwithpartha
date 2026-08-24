package tech.buildwithpartha.lifeos.sprint.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public record Sprint(
    UUID id,
    UUID userId,
    String name,
    Optional<String> goal,
    LocalDate startDate,
    LocalDate endDate,
    SprintStatus status,
    int targetCapacityPoints,
    Optional<String> retrospectiveNotes,
    Optional<String> whatWentWell,
    Optional<String> whatCouldBeImproved,
    List<String> actionItems,
    int committedTaskCount,
    int completedTaskCount,
    int addedTaskCount,
    int removedTaskCount,
    int carriedOverTaskCount,
    int totalStoryPoints,
    int completedStoryPoints,
    Optional<Instant> completedAt,
    Instant createdAt,
    Instant updatedAt,
    List<SprintTask> tasks,
    List<SprintEvent> events,
    long version) {
  public Sprint {
    Objects.requireNonNull(id);
    Objects.requireNonNull(userId);
    Objects.requireNonNull(name);
    Objects.requireNonNull(goal);
    Objects.requireNonNull(startDate);
    Objects.requireNonNull(endDate);
    Objects.requireNonNull(status);
    Objects.requireNonNull(retrospectiveNotes);
    Objects.requireNonNull(whatWentWell);
    Objects.requireNonNull(whatCouldBeImproved);
    Objects.requireNonNull(actionItems);
    Objects.requireNonNull(completedAt);
    Objects.requireNonNull(createdAt);
    Objects.requireNonNull(updatedAt);
    Objects.requireNonNull(tasks);
    Objects.requireNonNull(events);
    if (name.isBlank()) {
      throw new IllegalArgumentException("Sprint name must not be blank");
    }
    if (endDate.isBefore(startDate)) {
      throw new IllegalArgumentException("Invalid Sprint dates");
    }
    if (targetCapacityPoints < 0) {
      throw new IllegalArgumentException("Invalid Sprint capacity");
    }
    actionItems = List.copyOf(actionItems);
    tasks = List.copyOf(tasks);
    events = List.copyOf(events);
  }

  public List<SprintTask> activeTasks() {
    return tasks.stream().filter(SprintTask::active).toList();
  }
}
