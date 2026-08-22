package tech.buildwithpartha.lifeos.auth.domain;

import java.util.Optional;
import java.util.UUID;

/** A port over {@code public.users}, implemented in {@code auth.infrastructure} with JPA. */
public interface UserRepository {

  boolean existsByEmailNormalized(String emailNormalized);

  User save(User user);

  Optional<User> findById(UUID id);

  Optional<User> findByEmailNormalized(String emailNormalized);

  void deleteById(UUID id);
}
