package tech.buildwithpartha.lifeos.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;
import tech.buildwithpartha.lifeos.notification.domain.Notification;
import tech.buildwithpartha.lifeos.notification.domain.NotificationCategory;
import tech.buildwithpartha.lifeos.notification.domain.NotificationNotClearableException;
import tech.buildwithpartha.lifeos.notification.domain.NotificationPreferences;
import tech.buildwithpartha.lifeos.notification.domain.NotificationPreferencesRepository;
import tech.buildwithpartha.lifeos.notification.domain.NotificationRepository;

@DisplayName("NotificationService unit tests")
class NotificationServiceTests {

  private InMemoryNotificationRepository notificationRepository;
  private InMemoryNotificationPreferencesRepository preferencesRepository;
  private Clock clock;
  private NotificationService service;

  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    notificationRepository = new InMemoryNotificationRepository();
    preferencesRepository = new InMemoryNotificationPreferencesRepository();
    clock = Clock.fixed(Instant.parse("2026-08-31T12:00:00Z"), ZoneId.of("UTC"));
    service = new NotificationService(notificationRepository, preferencesRepository, clock);
  }

  @Test
  @DisplayName("Creates in-app notification with valid fields")
  void createsNotification() {
    Notification created =
        service.createNotification(
            userId,
            NotificationCategory.DUE_REMINDER,
            "Task Due",
            "Your task is due in 10 minutes.",
            "/life-os/app/tasks/123",
            true);

    assertThat(created.id()).isNotNull();
    assertThat(created.userId()).isEqualTo(userId);
    assertThat(created.category()).isEqualTo(NotificationCategory.DUE_REMINDER);
    assertThat(created.title()).isEqualTo("Task Due");
    assertThat(created.body()).isEqualTo("Your task is due in 10 minutes.");
    assertThat(created.targetUrl()).contains("/life-os/app/tasks/123");
    assertThat(created.isClearable()).isTrue();
    assertThat(created.isRead()).isFalse();
  }

  @Test
  @DisplayName("Security notifications are automatically marked non-clearable")
  void securityNotificationIsNonClearable() {
    Notification created =
        service.createNotification(
            userId,
            NotificationCategory.SECURITY,
            "Password Changed",
            "Your account password was updated.",
            "/life-os/app/settings/security",
            true);

    assertThat(created.category()).isEqualTo(NotificationCategory.SECURITY);
    assertThat(created.isClearable()).isFalse();
  }

  @Test
  @DisplayName("Marks notification read and unread")
  void marksReadAndUnread() {
    Notification created =
        service.createNotification(
            userId, NotificationCategory.SYSTEM, "Update", "System update", null, true);

    Notification read = service.markAsRead(created.id(), userId);
    assertThat(read.isRead()).isTrue();
    assertThat(read.readAt()).contains(clock.instant());

    Notification unread = service.markAsUnread(created.id(), userId);
    assertThat(unread.isRead()).isFalse();
    assertThat(unread.readAt()).isEmpty();
  }

  @Test
  @DisplayName("Marks all notifications as read for user")
  void marksAllAsRead() {
    service.createNotification(userId, NotificationCategory.FOCUS, "Focus A", "Body A", null, true);
    service.createNotification(userId, NotificationCategory.HABIT, "Habit B", "Body B", null, true);

    assertThat(service.getUnreadCount(userId)).isEqualTo(2);

    int count = service.markAllAsRead(userId);
    assertThat(count).isEqualTo(2);
    assertThat(service.getUnreadCount(userId)).isEqualTo(0);
  }

  @Test
  @DisplayName("Throws exception when attempting to clear non-clearable notice")
  void preventsClearingNonClearableNotice() {
    Notification secNotice =
        service.createNotification(
            userId,
            NotificationCategory.SECURITY,
            "Security Alert",
            "New login from unknown IP.",
            null,
            false);

    assertThatThrownBy(() -> service.clearNotification(secNotice.id(), userId))
        .isInstanceOf(NotificationNotClearableException.class)
        .hasMessageContaining("non-clearable notice");
  }

  @Test
  @DisplayName("Throws ResourceNotFoundException when notification is not found")
  void throwsNotFoundForMissingNotification() {
    UUID missingId = UUID.randomUUID();
    assertThatThrownBy(() -> service.markAsRead(missingId, userId))
        .isInstanceOf(tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException.class);
    assertThatThrownBy(() -> service.markAsUnread(missingId, userId))
        .isInstanceOf(tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException.class);
    assertThatThrownBy(() -> service.clearNotification(missingId, userId))
        .isInstanceOf(tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("Clears single clearable notification and bulk clearable notifications")
  void clearsClearableNotifications() {
    Notification normal =
        service.createNotification(
            userId, NotificationCategory.TIME_BLOCK, "TB", "Body", null, true);
    Notification sec =
        service.createNotification(
            userId, NotificationCategory.SECURITY, "Sec", "Body", null, false);

    service.clearNotification(normal.id(), userId);
    assertThat(notificationRepository.findByIdAndUserId(normal.id(), userId)).isEmpty();
    assertThat(notificationRepository.findByIdAndUserId(sec.id(), userId)).isPresent();

    Notification normal2 =
        service.createNotification(userId, NotificationCategory.REVIEW, "Rev", "Body", null, true);
    int cleared = service.clearAllClearable(userId);
    assertThat(cleared).isEqualTo(1);
    assertThat(notificationRepository.findByIdAndUserId(sec.id(), userId)).isPresent();
  }

  @Test
  @DisplayName("Gets default preferences and updates them")
  void managesPreferences() {
    NotificationPreferences prefs = service.getPreferences(userId);
    assertThat(prefs.userId()).isEqualTo(userId);
    assertThat(prefs.quietHoursEnabled()).isFalse();
    assertThat(prefs.quietHoursStart()).isEqualTo("22:00");
    assertThat(prefs.quietHoursEnd()).isEqualTo("07:00");

    NotificationPreferences updated =
        service.updatePreferences(
            userId, true, "23:00", "06:00", true, true, false, true, true, true, true, true, true,
            true, false);

    assertThat(updated.quietHoursEnabled()).isTrue();
    assertThat(updated.quietHoursStart()).isEqualTo("23:00");
    assertThat(updated.quietHoursEnd()).isEqualTo("06:00");
    assertThat(updated.timeBlockRemindersEnabled()).isFalse();
    assertThat(updated.emailChannelEnabled()).isTrue();
  }

  @Test
  @DisplayName("Purges clearable notifications older than 90 days")
  void purgesExpiredNotifications() {
    Instant oldTime = clock.instant().minus(NotificationService.RETENTION_PERIOD).minusSeconds(60);
    Notification oldClearable =
        new Notification(
            UUID.randomUUID(),
            userId,
            NotificationCategory.DUE_REMINDER,
            "Old Due",
            "Old Body",
            Optional.empty(),
            Optional.empty(),
            true,
            oldTime,
            0L);
    notificationRepository.save(oldClearable);

    Notification oldSecurity =
        new Notification(
            UUID.randomUUID(),
            userId,
            NotificationCategory.SECURITY,
            "Old Sec",
            "Old Sec Body",
            Optional.empty(),
            Optional.empty(),
            false,
            oldTime,
            0L);
    notificationRepository.save(oldSecurity);

    NotificationRetentionJob job = new NotificationRetentionJob(service);
    job.purgeExpiredNotifications();

    assertThat(notificationRepository.findByIdAndUserId(oldClearable.id(), userId)).isEmpty();
    assertThat(notificationRepository.findByIdAndUserId(oldSecurity.id(), userId)).isPresent();
  }

  @Test
  @DisplayName("Redacts title and body in toString() overrides")
  void toStringRedaction() {
    Notification n =
        Notification.create(
            userId,
            NotificationCategory.DUE_REMINDER,
            "Sensitive Title",
            "Sensitive Body",
            null,
            true,
            clock.instant());

    assertThat(n.toString())
        .doesNotContain("Sensitive Title")
        .doesNotContain("Sensitive Body")
        .contains("REDACTED");
  }

  // --- In-memory repository stubs ---

  private static class InMemoryNotificationRepository implements NotificationRepository {
    private final List<Notification> list = new ArrayList<>();

    @Override
    public Notification save(Notification notification) {
      list.removeIf(n -> n.id().equals(notification.id()));
      list.add(notification);
      return notification;
    }

    @Override
    public Optional<Notification> findByIdAndUserId(UUID id, UUID userId) {
      return list.stream().filter(n -> n.id().equals(id) && n.userId().equals(userId)).findFirst();
    }

    @Override
    public PageResponse<Notification> findByUserId(
        UUID userId, Boolean unreadOnly, Set<NotificationCategory> categories, int page, int size) {
      List<Notification> filtered =
          list.stream()
              .filter(n -> n.userId().equals(userId))
              .filter(n -> !Boolean.TRUE.equals(unreadOnly) || !n.isRead())
              .filter(
                  n ->
                      categories == null
                          || categories.isEmpty()
                          || categories.contains(n.category()))
              .sorted((a, b) -> b.createdAt().compareTo(a.createdAt()))
              .toList();

      int from = Math.min(page * size, filtered.size());
      int to = Math.min(from + size, filtered.size());
      List<Notification> paged = filtered.subList(from, to);
      int totalPages = (int) Math.ceil((double) filtered.size() / size);
      return new PageResponse<>(paged, page, size, filtered.size(), totalPages);
    }

    @Override
    public List<Notification> findAllByUserId(UUID userId) {
      return list.stream()
          .filter(n -> n.userId().equals(userId))
          .sorted((a, b) -> b.createdAt().compareTo(a.createdAt()))
          .toList();
    }

    @Override
    public long countUnreadByUserId(UUID userId) {
      return list.stream().filter(n -> n.userId().equals(userId) && !n.isRead()).count();
    }

    @Override
    public int markAllAsRead(UUID userId, Instant now) {
      int count = 0;
      for (int i = 0; i < list.size(); i++) {
        Notification n = list.get(i);
        if (n.userId().equals(userId) && !n.isRead()) {
          list.set(i, n.markRead(now));
          count++;
        }
      }
      return count;
    }

    @Override
    public boolean deleteByIdAndUserId(UUID id, UUID userId) {
      return list.removeIf(n -> n.id().equals(id) && n.userId().equals(userId));
    }

    @Override
    public int deleteAllClearableByUserId(UUID userId) {
      int before = list.size();
      list.removeIf(n -> n.userId().equals(userId) && n.isClearable());
      return before - list.size();
    }

    @Override
    public int deleteClearableOlderThan(Instant cutoff) {
      int before = list.size();
      list.removeIf(n -> n.isClearable() && n.createdAt().isBefore(cutoff));
      return before - list.size();
    }
  }

  private static class InMemoryNotificationPreferencesRepository
      implements NotificationPreferencesRepository {
    private final List<NotificationPreferences> list = new ArrayList<>();

    @Override
    public NotificationPreferences save(NotificationPreferences preferences) {
      list.removeIf(p -> p.userId().equals(preferences.userId()));
      list.add(preferences);
      return preferences;
    }

    @Override
    public Optional<NotificationPreferences> findByUserId(UUID userId) {
      return list.stream().filter(p -> p.userId().equals(userId)).findFirst();
    }
  }
}
