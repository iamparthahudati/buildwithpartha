package tech.buildwithpartha.lifeos.notification.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;
import tech.buildwithpartha.lifeos.notification.domain.Notification;
import tech.buildwithpartha.lifeos.notification.domain.NotificationCategory;
import tech.buildwithpartha.lifeos.notification.domain.NotificationNotClearableException;
import tech.buildwithpartha.lifeos.notification.domain.NotificationPreferences;
import tech.buildwithpartha.lifeos.notification.domain.NotificationPreferencesRepository;
import tech.buildwithpartha.lifeos.notification.domain.NotificationRepository;

/**
 * Transactional application service managing notifications and notification preferences (LOS-1303).
 */
@Service
@Transactional
public class NotificationService {

  private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
  public static final Duration RETENTION_PERIOD = Duration.ofDays(90);

  private final NotificationRepository notificationRepository;
  private final NotificationPreferencesRepository preferencesRepository;
  private final Clock clock;

  public NotificationService(
      NotificationRepository notificationRepository,
      NotificationPreferencesRepository preferencesRepository,
      Clock clock) {
    this.notificationRepository = notificationRepository;
    this.preferencesRepository = preferencesRepository;
    this.clock = clock;
  }

  public Notification createNotification(
      UUID userId,
      NotificationCategory category,
      String title,
      String body,
      String targetUrl,
      boolean isClearable) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(category, "category must not be null");
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(body, "body must not be null");

    Instant now = clock.instant();
    Notification notification =
        Notification.create(userId, category, title, body, targetUrl, isClearable, now);
    Notification saved = notificationRepository.save(notification);
    log.info(
        "Created notification id={} userId={} category={}",
        saved.id(),
        saved.userId(),
        saved.category());
    return saved;
  }

  @Transactional(readOnly = true)
  public PageResponse<Notification> getNotifications(
      UUID userId, Boolean unreadOnly, Set<NotificationCategory> categories, int page, int size) {
    Objects.requireNonNull(userId, "userId must not be null");
    int validPage = Math.max(0, page);
    int validSize = Math.min(Math.max(1, size), 100);
    return notificationRepository.findByUserId(
        userId, unreadOnly, categories, validPage, validSize);
  }

  @Transactional(readOnly = true)
  public long getUnreadCount(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return notificationRepository.countUnreadByUserId(userId);
  }

  public Notification markAsRead(UUID id, UUID userId) {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");

    Notification notification =
        notificationRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(
                () ->
                    new ResourceNotFoundException(
                        "Notification not found with id " + id + " for user " + userId));

    Instant now = clock.instant();
    Notification updated = notification.markRead(now);
    return notificationRepository.save(updated);
  }

  public Notification markAsUnread(UUID id, UUID userId) {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");

    Notification notification =
        notificationRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(
                () ->
                    new ResourceNotFoundException(
                        "Notification not found with id " + id + " for user " + userId));

    Notification updated = notification.markUnread();
    return notificationRepository.save(updated);
  }

  public int markAllAsRead(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Instant now = clock.instant();
    return notificationRepository.markAllAsRead(userId, now);
  }

  public void clearNotification(UUID id, UUID userId) {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");

    Notification notification =
        notificationRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(
                () ->
                    new ResourceNotFoundException(
                        "Notification not found with id " + id + " for user " + userId));

    if (!notification.isClearable()) {
      throw new NotificationNotClearableException(
          "Notification id " + id + " is a non-clearable notice and cannot be removed.");
    }

    notificationRepository.deleteByIdAndUserId(id, userId);
  }

  public int clearAllClearable(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return notificationRepository.deleteAllClearableByUserId(userId);
  }

  @Transactional(readOnly = true)
  public NotificationPreferences getPreferences(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Instant now = clock.instant();
    return preferencesRepository
        .findByUserId(userId)
        .orElseGet(
            () -> preferencesRepository.save(NotificationPreferences.createDefault(userId, now)));
  }

  public NotificationPreferences updatePreferences(
      UUID userId,
      boolean quietHoursEnabled,
      String quietHoursStart,
      String quietHoursEnd,
      boolean dueRemindersEnabled,
      boolean overdueRemindersEnabled,
      boolean timeBlockRemindersEnabled,
      boolean focusRemindersEnabled,
      boolean habitRemindersEnabled,
      boolean reviewPromptsEnabled,
      boolean securityNoticesEnabled,
      boolean systemNoticesEnabled,
      boolean inAppChannelEnabled,
      boolean emailChannelEnabled,
      boolean pushChannelEnabled) {
    Objects.requireNonNull(userId, "userId must not be null");
    Instant now = clock.instant();

    NotificationPreferences existing = getPreferences(userId);
    NotificationPreferences updated =
        existing.update(
            quietHoursEnabled,
            quietHoursStart,
            quietHoursEnd,
            dueRemindersEnabled,
            overdueRemindersEnabled,
            timeBlockRemindersEnabled,
            focusRemindersEnabled,
            habitRemindersEnabled,
            reviewPromptsEnabled,
            securityNoticesEnabled,
            systemNoticesEnabled,
            inAppChannelEnabled,
            emailChannelEnabled,
            pushChannelEnabled,
            now);

    return preferencesRepository.save(updated);
  }

  public int purgeExpiredNotifications() {
    Instant cutoff = clock.instant().minus(RETENTION_PERIOD);
    int deleted = notificationRepository.deleteClearableOlderThan(cutoff);
    log.info("Purged {} clearable notifications created before {}", deleted, cutoff);
    return deleted;
  }
}
