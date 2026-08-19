package tech.buildwithpartha.lifeos.user.api;

import tech.buildwithpartha.lifeos.user.domain.UserProfile;

public record OnboardingProfileDto(
    String displayName, String timeZone, String locale, int weekStart) {

  public static OnboardingProfileDto fromDomain(UserProfile profile) {
    return new OnboardingProfileDto(
        profile.displayName(), profile.timeZone(), profile.locale(), profile.weekStart());
  }
}
