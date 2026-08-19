package tech.buildwithpartha.lifeos.user.application;

import java.util.Objects;

/** Command to record Step 1 (Welcome and privacy) display name confirmation. */
public record UpdateWelcomeStepCommand(String displayName) {

  public UpdateWelcomeStepCommand {
    Objects.requireNonNull(displayName, "displayName must not be null");
    if (displayName.isBlank()) {
      throw new IllegalArgumentException("displayName must not be blank");
    }
  }
}
