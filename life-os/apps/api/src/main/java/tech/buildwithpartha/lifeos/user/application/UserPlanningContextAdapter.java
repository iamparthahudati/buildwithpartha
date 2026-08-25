package tech.buildwithpartha.lifeos.user.application;

import java.time.DayOfWeek;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.user.UserPlanningContext;
import tech.buildwithpartha.lifeos.common.user.UserPlanningContextProvider;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;

/** Exposes Account week-boundary settings through the domain-neutral planning contract. */
@Component
public class UserPlanningContextAdapter implements UserPlanningContextProvider {
  private final UserProfileService profiles;

  public UserPlanningContextAdapter(UserProfileService profiles) {
    this.profiles = profiles;
  }

  @Override
  public UserPlanningContext getPlanningContext(UUID userId) {
    UserProfile profile = profiles.getProfile(userId);
    return new UserPlanningContext(
        ZoneId.of(profile.timeZone()), DayOfWeek.of(profile.weekStart()));
  }
}
