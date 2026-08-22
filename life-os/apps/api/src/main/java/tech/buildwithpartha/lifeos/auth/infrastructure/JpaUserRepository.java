package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

@Component
class JpaUserRepository implements UserRepository {

  private final UserJpaRepository jpaRepository;

  JpaUserRepository(UserJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public boolean existsByEmailNormalized(String emailNormalized) {
    return jpaRepository.existsByEmailNormalized(emailNormalized);
  }

  @Override
  public User save(User user) {
    return toDomain(jpaRepository.save(toEntity(user)));
  }

  @Override
  public Optional<User> findById(UUID id) {
    return jpaRepository.findById(id).map(JpaUserRepository::toDomain);
  }

  @Override
  public Optional<User> findByEmailNormalized(String emailNormalized) {
    return jpaRepository.findByEmailNormalized(emailNormalized).map(JpaUserRepository::toDomain);
  }

  @Override
  public void deleteById(UUID id) {
    jpaRepository.deleteById(id);
  }

  private static UserEntity toEntity(User user) {
    return new UserEntity(
        user.id(),
        user.email().raw(),
        user.email().normalized(),
        user.displayName(),
        user.timeZone(),
        user.locale(),
        (short) user.weekStart(),
        user.accountStatus(),
        user.verifiedAt().orElse(null),
        user.createdAt(),
        user.updatedAt(),
        user.version());
  }

  private static User toDomain(UserEntity entity) {
    return new User(
        entity.getId(),
        new EmailAddress(entity.getEmail(), entity.getEmailNormalized()),
        entity.getDisplayName(),
        entity.getTimeZone(),
        entity.getLocale(),
        entity.getWeekStart(),
        entity.getAccountStatus(),
        Optional.ofNullable(entity.getVerifiedAt()),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        entity.getVersion());
  }
}
