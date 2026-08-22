package tech.buildwithpartha.lifeos.user.application;

import java.util.Objects;
import tech.buildwithpartha.lifeos.user.domain.PlanningDefaults;

/** Command to update planning and focus default preferences. */
public record UpdatePreferencesCommand(PlanningDefaults planningDefaults) {

  public UpdatePreferencesCommand {
    Objects.requireNonNull(planningDefaults, "planningDefaults must not be null");
  }
}
