package tech.buildwithpartha.lifeos.notification.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.notification.domain.NotificationPreferences;

@Entity
@Table(name = "notification_preferences")
public class NotificationPreferencesEntity {

  @Id private UUID id;

  @Column(name = "user_id", nullable = false, unique = true)
  private UUID userId;

  @Column(name = "quiet_hours_enabled", nullable = false)
  private boolean quietHoursEnabled;

  @Column(name = "quiet_hours_start", nullable = false)
  private String quietHoursStart;

  @Column(name = "quiet_hours_end", nullable = false)
  private String quietHoursEnd;

  @Column(name = "due_reminders_enabled", nullable = false)
  private boolean dueRemindersEnabled;

  @Column(name = "overdue_reminders_enabled", nullable = false)
  private boolean overdueRemindersEnabled;

  @Column(name = "time_block_reminders_enabled", nullable = false)
  private boolean timeBlockRemindersEnabled;

  @Column(name = "focus_reminders_enabled", nullable = false)
  private boolean focusRemindersEnabled;

  @Column(name = "habit_reminders_enabled", nullable = false)
  private boolean habitRemindersEnabled;

  @Column(name = "review_prompts_enabled", nullable = false)
  private boolean reviewPromptsEnabled;

  @Column(name = "security_notices_enabled", nullable = false)
  private boolean securityNoticesEnabled;

  @Column(name = "system_notices_enabled", nullable = false)
  private boolean systemNoticesEnabled;

  @Column(name = "in_app_channel_enabled", nullable = false)
  private boolean inAppChannelEnabled;

  @Column(name = "email_channel_enabled", nullable = false)
  private boolean emailChannelEnabled;

  @Column(name = "push_channel_enabled", nullable = false)
  private boolean pushChannelEnabled;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected NotificationPreferencesEntity() {}

  public NotificationPreferencesEntity(
      UUID id,
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
      boolean pushChannelEnabled,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.quietHoursEnabled = quietHoursEnabled;
    this.quietHoursStart = quietHoursStart;
    this.quietHoursEnd = quietHoursEnd;
    this.dueRemindersEnabled = dueRemindersEnabled;
    this.overdueRemindersEnabled = overdueRemindersEnabled;
    this.timeBlockRemindersEnabled = timeBlockRemindersEnabled;
    this.focusRemindersEnabled = focusRemindersEnabled;
    this.habitRemindersEnabled = habitRemindersEnabled;
    this.reviewPromptsEnabled = reviewPromptsEnabled;
    this.securityNoticesEnabled = securityNoticesEnabled;
    this.systemNoticesEnabled = systemNoticesEnabled;
    this.inAppChannelEnabled = inAppChannelEnabled;
    this.emailChannelEnabled = emailChannelEnabled;
    this.pushChannelEnabled = pushChannelEnabled;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  public static NotificationPreferencesEntity fromDomain(NotificationPreferences domain) {
    return new NotificationPreferencesEntity(
        domain.id(),
        domain.userId(),
        domain.quietHoursEnabled(),
        domain.quietHoursStart(),
        domain.quietHoursEnd(),
        domain.dueRemindersEnabled(),
        domain.overdueRemindersEnabled(),
        domain.timeBlockRemindersEnabled(),
        domain.focusRemindersEnabled(),
        domain.habitRemindersEnabled(),
        domain.reviewPromptsEnabled(),
        domain.securityNoticesEnabled(),
        domain.systemNoticesEnabled(),
        domain.inAppChannelEnabled(),
        domain.emailChannelEnabled(),
        domain.pushChannelEnabled(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }

  public NotificationPreferences toDomain() {
    return new NotificationPreferences(
        id,
        userId,
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
        createdAt,
        updatedAt,
        version);
  }
}
