package tech.buildwithpartha.lifeos.notification.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.notification.domain.NotificationPreferences;
import tech.buildwithpartha.lifeos.notification.domain.NotificationPreferencesRepository;

@Repository
public class JpaNotificationPreferencesRepositoryAdapter
    implements NotificationPreferencesRepository {

  private final NotificationPreferencesJpaRepository jpaRepository;

  public JpaNotificationPreferencesRepositoryAdapter(
      NotificationPreferencesJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public NotificationPreferences save(NotificationPreferences preferences) {
    NotificationPreferencesEntity entity = NotificationPreferencesEntity.fromDomain(preferences);
    return jpaRepository.save(entity).toDomain();
  }

  @Override
  public Optional<NotificationPreferences> findByUserId(UUID userId) {
    return jpaRepository.findByUserId(userId).map(NotificationPreferencesEntity::toDomain);
  }
}
