package tech.buildwithpartha.lifeos.notification.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;

/** Domain repository port interface for notifications (LOS-1303). */
public interface NotificationRepository {

  Notification save(Notification notification);

  Optional<Notification> findByIdAndUserId(UUID id, UUID userId);

  PageResponse<Notification> findByUserId(
      UUID userId, Boolean unreadOnly, Set<NotificationCategory> categories, int page, int size);

  List<Notification> findAllByUserId(UUID userId);

  long countUnreadByUserId(UUID userId);

  int markAllAsRead(UUID userId, Instant now);

  boolean deleteByIdAndUserId(UUID id, UUID userId);

  int deleteAllClearableByUserId(UUID userId);

  int deleteClearableOlderThan(Instant cutoff);
}
