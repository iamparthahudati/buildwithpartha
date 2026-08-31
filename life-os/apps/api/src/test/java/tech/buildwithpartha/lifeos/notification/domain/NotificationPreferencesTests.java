package tech.buildwithpartha.lifeos.notification.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("NotificationPreferences domain unit tests")
class NotificationPreferencesTests {

  private final UUID userId = UUID.randomUUID();
  private final Instant now = Instant.parse("2026-08-31T12:00:00Z");

  @Test
  @DisplayName("Creates default preferences with valid 22:00 and 07:00 defaults")
  void createsDefaultPreferences() {
    NotificationPreferences prefs = NotificationPreferences.createDefault(userId, now);
    assertThat(prefs.userId()).isEqualTo(userId);
    assertThat(prefs.quietHoursEnabled()).isFalse();
    assertThat(prefs.quietHoursStart()).isEqualTo("22:00");
    assertThat(prefs.quietHoursEnd()).isEqualTo("07:00");
    assertThat(prefs.dueRemindersEnabled()).isTrue();
    assertThat(prefs.overdueRemindersEnabled()).isTrue();
    assertThat(prefs.timeBlockRemindersEnabled()).isTrue();
    assertThat(prefs.focusRemindersEnabled()).isTrue();
    assertThat(prefs.habitRemindersEnabled()).isTrue();
    assertThat(prefs.reviewPromptsEnabled()).isTrue();
    assertThat(prefs.securityNoticesEnabled()).isTrue();
    assertThat(prefs.systemNoticesEnabled()).isTrue();
    assertThat(prefs.inAppChannelEnabled()).isTrue();
    assertThat(prefs.emailChannelEnabled()).isFalse();
    assertThat(prefs.pushChannelEnabled()).isFalse();
  }

  @Test
  @DisplayName("Rejects invalid HH:mm time formats for quiet hours")
  void validatesQuietHoursFormat() {
    assertThatThrownBy(
            () ->
                new NotificationPreferences(
                    UUID.randomUUID(),
                    userId,
                    true,
                    "25:00",
                    "07:00",
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    false,
                    false,
                    now,
                    now,
                    0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("HH:mm format");

    assertThatThrownBy(
            () ->
                new NotificationPreferences(
                    UUID.randomUUID(),
                    userId,
                    true,
                    "22:00",
                    "07:99",
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    false,
                    false,
                    now,
                    now,
                    0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("HH:mm format");
  }

  @Test
  @DisplayName("Updates preferences successfully")
  void updatesPreferences() {
    NotificationPreferences initial = NotificationPreferences.createDefault(userId, now);
    Instant later = now.plusSeconds(3600);
    NotificationPreferences updated =
        initial.update(
            true, "23:00", "06:00", true, true, false, true, true, true, true, true, true, true,
            true, later);

    assertThat(updated.quietHoursEnabled()).isTrue();
    assertThat(updated.quietHoursStart()).isEqualTo("23:00");
    assertThat(updated.quietHoursEnd()).isEqualTo("06:00");
    assertThat(updated.timeBlockRemindersEnabled()).isFalse();
    assertThat(updated.emailChannelEnabled()).isTrue();
    assertThat(updated.pushChannelEnabled()).isTrue();
    assertThat(updated.updatedAt()).isEqualTo(later);
  }
}
