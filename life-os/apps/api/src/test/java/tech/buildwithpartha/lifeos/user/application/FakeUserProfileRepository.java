package tech.buildwithpartha.lifeos.user.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;
import tech.buildwithpartha.lifeos.user.domain.UserProfileRepository;

final class FakeUserProfileRepository implements UserProfileRepository {

  private final List<UserProfile> saved = new ArrayList<>();

  @Override
  public Optional<UserProfile> findByUserId(UUID userId) {
    UserProfile latest = null;
    for (UserProfile profile : saved) {
      if (profile.userId().equals(userId)) {
        latest = profile;
      }
    }
    return Optional.ofNullable(latest);
  }

  @Override
  public UserProfile save(UserProfile profile) {
    saved.add(profile);
    return profile;
  }
}
