package tech.buildwithpartha.lifeos.user.application;

import java.util.Objects;

/** Command to update account profile and localization settings. */
public record UpdateProfileCommand(
    String displayName, String timeZone, String locale, int weekStart) {

  public UpdateProfileCommand {
    Objects.requireNonNull(displayName, "displayName must not be null");
    Objects.requireNonNull(timeZone, "timeZone must not be null");
    Objects.requireNonNull(locale, "locale must not be null");
  }
}
