package tech.buildwithpartha.lifeos.user.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import tech.buildwithpartha.lifeos.user.domain.OnboardingStatus;
import tech.buildwithpartha.lifeos.user.domain.OnboardingStep;

/**
 * JPA row for {@code public.user_preferences} ({@code
 * V4__user_preferences_and_onboarding_schema.sql}).
 */
@Entity
@Table(name = "user_preferences", schema = "public")
class UserPreferencesEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, unique = true, updatable = false)
  private UUID userId;

  @Column(name = "onboarding_version", nullable = false)
  private int onboardingVersion;

  @Enumerated(EnumType.STRING)
  @Column(name = "onboarding_status", nullable = false)
  private OnboardingStatus onboardingStatus;

  @Enumerated(EnumType.STRING)
  @Column(name = "last_completed_step")
  private OnboardingStep lastCompletedStep;

  @Column(name = "onboarding_completed_at")
  private Instant onboardingCompletedAt;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(name = "working_days", nullable = false)
  private Integer[] workingDays;

  @Column(name = "work_start_time")
  private LocalTime workStartTime;

  @Column(name = "work_end_time")
  private LocalTime workEndTime;

  @Column(name = "overnight_schedule", nullable = false)
  private boolean overnightSchedule;

  @Column(name = "daily_focus_target_minutes")
  private Integer dailyFocusTargetMinutes;

  @Column(name = "focus_duration_minutes", nullable = false)
  private int focusDurationMinutes;

  @Column(name = "break_duration_minutes", nullable = false)
  private int breakDurationMinutes;

  @Column(name = "long_break_duration_minutes", nullable = false)
  private int longBreakDurationMinutes;

  @Column(name = "focus_sessions_before_long_break", nullable = false)
  private int focusSessionsBeforeLongBreak;

  @Column(name = "auto_start_breaks", nullable = false)
  private boolean autoStartBreaks;

  @Column(name = "auto_start_focus_sessions", nullable = false)
  private boolean autoStartFocusSessions;

  @Column(name = "sound_enabled", nullable = false)
  private boolean soundEnabled;

  @Column(name = "browser_notifications_enabled", nullable = false)
  private boolean browserNotificationsEnabled;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected UserPreferencesEntity() {}

  UserPreferencesEntity(
      UUID id,
      UUID userId,
      int onboardingVersion,
      OnboardingStatus onboardingStatus,
      OnboardingStep lastCompletedStep,
      Instant onboardingCompletedAt,
      Integer[] workingDays,
      LocalTime workStartTime,
      LocalTime workEndTime,
      boolean overnightSchedule,
      Integer dailyFocusTargetMinutes,
      int focusDurationMinutes,
      int breakDurationMinutes,
      int longBreakDurationMinutes,
      int focusSessionsBeforeLongBreak,
      boolean autoStartBreaks,
      boolean autoStartFocusSessions,
      boolean soundEnabled,
      boolean browserNotificationsEnabled,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.onboardingVersion = onboardingVersion;
    this.onboardingStatus = onboardingStatus;
    this.lastCompletedStep = lastCompletedStep;
    this.onboardingCompletedAt = onboardingCompletedAt;
    this.workingDays = workingDays;
    this.workStartTime = workStartTime;
    this.workEndTime = workEndTime;
    this.overnightSchedule = overnightSchedule;
    this.dailyFocusTargetMinutes = dailyFocusTargetMinutes;
    this.focusDurationMinutes = focusDurationMinutes;
    this.breakDurationMinutes = breakDurationMinutes;
    this.longBreakDurationMinutes = longBreakDurationMinutes;
    this.focusSessionsBeforeLongBreak = focusSessionsBeforeLongBreak;
    this.autoStartBreaks = autoStartBreaks;
    this.autoStartFocusSessions = autoStartFocusSessions;
    this.soundEnabled = soundEnabled;
    this.browserNotificationsEnabled = browserNotificationsEnabled;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  int getOnboardingVersion() {
    return onboardingVersion;
  }

  OnboardingStatus getOnboardingStatus() {
    return onboardingStatus;
  }

  OnboardingStep getLastCompletedStep() {
    return lastCompletedStep;
  }

  Instant getOnboardingCompletedAt() {
    return onboardingCompletedAt;
  }

  List<Integer> getWorkingDaysList() {
    return workingDays == null ? List.of() : Arrays.asList(workingDays);
  }

  LocalTime getWorkStartTime() {
    return workStartTime;
  }

  LocalTime getWorkEndTime() {
    return workEndTime;
  }

  boolean isOvernightSchedule() {
    return overnightSchedule;
  }

  Integer getDailyFocusTargetMinutes() {
    return dailyFocusTargetMinutes;
  }

  int getFocusDurationMinutes() {
    return focusDurationMinutes;
  }

  int getBreakDurationMinutes() {
    return breakDurationMinutes;
  }

  int getLongBreakDurationMinutes() {
    return longBreakDurationMinutes;
  }

  int getFocusSessionsBeforeLongBreak() {
    return focusSessionsBeforeLongBreak;
  }

  boolean isAutoStartBreaks() {
    return autoStartBreaks;
  }

  boolean isAutoStartFocusSessions() {
    return autoStartFocusSessions;
  }

  boolean isSoundEnabled() {
    return soundEnabled;
  }

  boolean isBrowserNotificationsEnabled() {
    return browserNotificationsEnabled;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getUpdatedAt() {
    return updatedAt;
  }

  long getVersion() {
    return version;
  }
}
