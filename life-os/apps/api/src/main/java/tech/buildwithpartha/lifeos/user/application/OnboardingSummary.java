package tech.buildwithpartha.lifeos.user.application;

import java.util.Objects;
import tech.buildwithpartha.lifeos.user.domain.UserPreferences;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;

/** Consolidated view of a user's profile, preferences, and onboarding state. */
public record OnboardingSummary(UserProfile profile, UserPreferences preferences) {

  public OnboardingSummary {
    Objects.requireNonNull(profile, "profile must not be null");
    Objects.requireNonNull(preferences, "preferences must not be null");
  }
}
