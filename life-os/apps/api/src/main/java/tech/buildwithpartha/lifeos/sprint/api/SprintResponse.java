package tech.buildwithpartha.lifeos.sprint.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.domain.Sprint;
import tech.buildwithpartha.lifeos.sprint.domain.SprintStatus;

public record SprintResponse(
    UUID id,
    String name,
    String goal,
    LocalDate startDate,
    LocalDate endDate,
    SprintStatus status,
    int targetCapacityPoints,
    int committedTaskCount,
    int completedTaskCount,
    int addedTaskCount,
    int removedTaskCount,
    int carriedOverTaskCount,
    int totalStoryPoints,
    int completedStoryPoints,
    String retrospectiveNotes,
    String whatWentWell,
    String whatCouldBeImproved,
    List<String> actionItems,
    Instant completedAt,
    Instant createdAt,
    Instant updatedAt,
    List<SprintTaskResponse> tasks,
    List<SprintEventResponse> events,
    long version) {
  static SprintResponse fromDomain(Sprint sprint) {
    return new SprintResponse(
        sprint.id(),
        sprint.name(),
        sprint.goal().orElse(null),
        sprint.startDate(),
        sprint.endDate(),
        sprint.status(),
        sprint.targetCapacityPoints(),
        sprint.committedTaskCount(),
        sprint.completedTaskCount(),
        sprint.addedTaskCount(),
        sprint.removedTaskCount(),
        sprint.carriedOverTaskCount(),
        sprint.totalStoryPoints(),
        sprint.completedStoryPoints(),
        sprint.retrospectiveNotes().orElse(null),
        sprint.whatWentWell().orElse(null),
        sprint.whatCouldBeImproved().orElse(null),
        sprint.actionItems(),
        sprint.completedAt().orElse(null),
        sprint.createdAt(),
        sprint.updatedAt(),
        sprint.tasks().stream().map(SprintTaskResponse::fromDomain).toList(),
        sprint.events().stream().map(SprintEventResponse::fromDomain).toList(),
        sprint.version());
  }
}
