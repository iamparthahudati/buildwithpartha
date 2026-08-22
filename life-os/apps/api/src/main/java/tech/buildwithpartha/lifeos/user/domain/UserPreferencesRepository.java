package tech.buildwithpartha.lifeos.user.domain;

import java.util.Optional;
import java.util.UUID;

/** Port for loading and persisting {@link UserPreferences} aggregates. */
public interface UserPreferencesRepository {

  Optional<UserPreferences> findByUserId(UUID userId);

  UserPreferences save(UserPreferences preferences);

  void deleteByUserId(UUID userId);
}
