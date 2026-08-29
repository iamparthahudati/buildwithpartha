package tech.buildwithpartha.lifeos.sprint.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public record CompleteSprintCommand(
    Optional<String> retrospectiveNotes,
    Optional<String> whatWentWell,
    Optional<String> whatCouldBeImproved,
    List<String> actionItems,
    CarryOverDestination carryOverDestination,
    Optional<UUID> targetSprintId,
    Optional<Long> targetVersion,
    long version) {
  public enum CarryOverDestination {
    BACKLOG,
    NEXT_SPRINT
  }
}
