package tech.buildwithpartha.lifeos.notification.domain;

import java.util.Optional;
import java.util.UUID;

/** Domain repository port interface for notification preferences (LOS-1303). */
public interface NotificationPreferencesRepository {

  NotificationPreferences save(NotificationPreferences preferences);

  Optional<NotificationPreferences> findByUserId(UUID userId);
}
