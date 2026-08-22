package tech.buildwithpartha.lifeos.user.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;
import tech.buildwithpartha.lifeos.user.domain.UserProfileRepository;

@Repository
public class JpaUserProfileRepository implements UserProfileRepository {

  private final UserProfileJpaRepository jpaRepository;

  public JpaUserProfileRepository(UserProfileJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public Optional<UserProfile> findByUserId(UUID userId) {
    return jpaRepository.findById(userId).map(JpaUserProfileRepository::toDomain);
  }

  @Override
  public UserProfile save(UserProfile profile) {
    UserProfileEntity entity = toEntity(profile);
    UserProfileEntity saved = jpaRepository.save(entity);
    return toDomain(saved);
  }

  static UserProfile toDomain(UserProfileEntity entity) {
    return new UserProfile(
        entity.getId(),
        entity.getEmail(),
        entity.getDisplayName(),
        entity.getTimeZone(),
        entity.getLocale(),
        entity.getWeekStart(),
        entity.getVersion());
  }

  static UserProfileEntity toEntity(UserProfile domain) {
    return new UserProfileEntity(
        domain.userId(),
        domain.email(),
        domain.displayName(),
        domain.timeZone(),
        domain.locale(),
        (short) domain.weekStart(),
        Instant.now(),
        domain.version());
  }
}
