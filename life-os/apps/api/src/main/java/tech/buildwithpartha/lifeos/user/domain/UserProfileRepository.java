package tech.buildwithpartha.lifeos.user.domain;

import java.util.Optional;
import java.util.UUID;

/** Port for loading and updating account profile fields on {@code public.users}. */
public interface UserProfileRepository {

  Optional<UserProfile> findByUserId(UUID userId);

  UserProfile save(UserProfile profile);
}
