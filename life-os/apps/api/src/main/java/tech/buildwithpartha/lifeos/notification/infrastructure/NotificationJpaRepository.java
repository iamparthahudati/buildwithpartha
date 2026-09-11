package tech.buildwithpartha.lifeos.notification.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tech.buildwithpartha.lifeos.notification.domain.NotificationCategory;

public interface NotificationJpaRepository extends JpaRepository<NotificationEntity, UUID> {

  Optional<NotificationEntity> findByIdAndUserId(UUID id, UUID userId);

  java.util.List<NotificationEntity> findByUserIdOrderByCreatedAtDescIdDesc(UUID userId);

  @Query(
      "SELECT n FROM NotificationEntity n WHERE n.userId = :userId "
          + "AND (:unreadOnly = FALSE OR n.readAt IS NULL) "
          + "AND (:hasCategories = FALSE OR n.category IN :categories) "
          + "ORDER BY n.createdAt DESC, n.id DESC")
  Page<NotificationEntity> findByUserIdFiltered(
      @Param("userId") UUID userId,
      @Param("unreadOnly") boolean unreadOnly,
      @Param("hasCategories") boolean hasCategories,
      @Param("categories") Set<NotificationCategory> categories,
      Pageable pageable);

  @Query("SELECT COUNT(n) FROM NotificationEntity n WHERE n.userId = :userId AND n.readAt IS NULL")
  long countUnreadByUserId(@Param("userId") UUID userId);

  @Modifying
  @Query(
      "UPDATE NotificationEntity n SET n.readAt = :now "
          + "WHERE n.userId = :userId AND n.readAt IS NULL")
  int markAllAsRead(@Param("userId") UUID userId, @Param("now") Instant now);

  @Modifying
  @Query("DELETE FROM NotificationEntity n WHERE n.userId = :userId AND n.isClearable = TRUE")
  int deleteAllClearableByUserId(@Param("userId") UUID userId);

  @Modifying
  @Query("DELETE FROM NotificationEntity n WHERE n.isClearable = TRUE AND n.createdAt < :cutoff")
  int deleteClearableOlderThan(@Param("cutoff") Instant cutoff);
}
