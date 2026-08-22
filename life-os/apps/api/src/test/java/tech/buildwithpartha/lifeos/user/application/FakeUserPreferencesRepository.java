package tech.buildwithpartha.lifeos.user.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.user.domain.UserPreferences;
import tech.buildwithpartha.lifeos.user.domain.UserPreferencesRepository;

final class FakeUserPreferencesRepository implements UserPreferencesRepository {

  private final List<UserPreferences> saved = new ArrayList<>();

  @Override
  public Optional<UserPreferences> findByUserId(UUID userId) {
    UserPreferences latest = null;
    for (UserPreferences preferences : saved) {
      if (preferences.userId().equals(userId)) {
        latest = preferences;
      }
    }
    return Optional.ofNullable(latest);
  }

  @Override
  public UserPreferences save(UserPreferences preferences) {
    saved.add(preferences);
    return preferences;
  }

  @Override
  public void deleteByUserId(UUID userId) {
    saved.removeIf(preferences -> preferences.userId().equals(userId));
  }
}
