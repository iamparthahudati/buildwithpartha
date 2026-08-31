package tech.buildwithpartha.lifeos.notification.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;
import tech.buildwithpartha.lifeos.notification.domain.Notification;
import tech.buildwithpartha.lifeos.notification.domain.NotificationCategory;
import tech.buildwithpartha.lifeos.notification.domain.NotificationRepository;

@Repository
public class JpaNotificationRepositoryAdapter implements NotificationRepository {

  private final NotificationJpaRepository jpaRepository;

  public JpaNotificationRepositoryAdapter(NotificationJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public Notification save(Notification notification) {
    NotificationEntity entity = NotificationEntity.fromDomain(notification);
    return jpaRepository.save(entity).toDomain();
  }

  @Override
  public Optional<Notification> findByIdAndUserId(UUID id, UUID userId) {
    return jpaRepository.findByIdAndUserId(id, userId).map(NotificationEntity::toDomain);
  }

  @Override
  public PageResponse<Notification> findByUserId(
      UUID userId, Boolean unreadOnly, Set<NotificationCategory> categories, int page, int size) {
    boolean isUnreadOnly = Boolean.TRUE.equals(unreadOnly);
    boolean hasCategories = categories != null && !categories.isEmpty();
    PageRequest pageable = PageRequest.of(page, size);
    Page<NotificationEntity> result =
        jpaRepository.findByUserIdFiltered(
            userId, isUnreadOnly, hasCategories, categories, pageable);

    List<Notification> items =
        result.getContent().stream().map(NotificationEntity::toDomain).toList();
    return new PageResponse<>(
        items,
        result.getNumber(),
        result.getSize(),
        result.getTotalElements(),
        result.getTotalPages());
  }

  @Override
  public long countUnreadByUserId(UUID userId) {
    return jpaRepository.countUnreadByUserId(userId);
  }

  @Override
  public int markAllAsRead(UUID userId, Instant now) {
    return jpaRepository.markAllAsRead(userId, now);
  }

  @Override
  public boolean deleteByIdAndUserId(UUID id, UUID userId) {
    Optional<NotificationEntity> entity = jpaRepository.findByIdAndUserId(id, userId);
    if (entity.isPresent()) {
      jpaRepository.delete(entity.get());
      return true;
    }
    return false;
  }

  @Override
  public int deleteAllClearableByUserId(UUID userId) {
    return jpaRepository.deleteAllClearableByUserId(userId);
  }

  @Override
  public int deleteClearableOlderThan(Instant cutoff) {
    return jpaRepository.deleteClearableOlderThan(cutoff);
  }
}
