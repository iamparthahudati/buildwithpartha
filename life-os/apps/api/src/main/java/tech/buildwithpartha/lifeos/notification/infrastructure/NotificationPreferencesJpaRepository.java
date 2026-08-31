package tech.buildwithpartha.lifeos.notification.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationPreferencesJpaRepository
    extends JpaRepository<NotificationPreferencesEntity, UUID> {

  Optional<NotificationPreferencesEntity> findByUserId(UUID userId);
}
