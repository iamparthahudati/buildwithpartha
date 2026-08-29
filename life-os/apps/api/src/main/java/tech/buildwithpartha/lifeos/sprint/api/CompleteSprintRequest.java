package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.application.CompleteSprintCommand;

public record CompleteSprintRequest(
    @Size(max = 4000) String retrospectiveNotes,
    @Size(max = 4000) String whatWentWell,
    @Size(max = 4000) String whatCouldBeImproved,
    @Size(max = 20) List<@Size(max = 500) String> actionItems,
    @NotNull CompleteSprintCommand.CarryOverDestination carryOverDestination,
    UUID targetSprintId,
    @PositiveOrZero Long targetVersion,
    @PositiveOrZero long version) {
  public CompleteSprintRequest {
    actionItems = actionItems == null ? List.of() : List.copyOf(actionItems);
  }
}
