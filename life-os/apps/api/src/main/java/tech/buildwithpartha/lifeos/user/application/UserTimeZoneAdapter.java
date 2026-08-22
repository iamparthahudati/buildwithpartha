package tech.buildwithpartha.lifeos.user.application;

import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.user.UserTimeZoneProvider;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;

/** Application adapter implementing UserTimeZoneProvider using UserProfileService (LOS-0607). */
@Component
public class UserTimeZoneAdapter implements UserTimeZoneProvider {

  private final UserProfileService userProfileService;

  public UserTimeZoneAdapter(UserProfileService userProfileService) {
    this.userProfileService = userProfileService;
  }

  @Override
  public String getUserTimeZone(UUID userId) {
    if (userId == null) {
      return UserProfile.DEFAULT_TIME_ZONE;
    }
    try {
      UserProfile profile = userProfileService.getProfile(userId);
      return profile.timeZone();
    } catch (Exception e) {
      return UserProfile.DEFAULT_TIME_ZONE;
    }
  }
}
