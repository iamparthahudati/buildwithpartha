package tech.buildwithpartha.lifeos.auth.domain;

/** A port over {@code public.users}, implemented in {@code auth.infrastructure} with JPA. */
public interface UserRepository {

  boolean existsByEmailNormalized(String emailNormalized);

  User save(User user);
}
