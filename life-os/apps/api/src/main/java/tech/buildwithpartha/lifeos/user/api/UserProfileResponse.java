package tech.buildwithpartha.lifeos.user.api;

import tech.buildwithpartha.lifeos.user.domain.UserProfile;

public record UserProfileResponse(
    String id, String email, String displayName, String timeZone, String locale, int weekStart) {

  public static UserProfileResponse fromDomain(UserProfile profile) {
    return new UserProfileResponse(
        profile.userId().toString(),
        profile.email(),
        profile.displayName(),
        profile.timeZone(),
        profile.locale(),
        profile.weekStart());
  }
}
