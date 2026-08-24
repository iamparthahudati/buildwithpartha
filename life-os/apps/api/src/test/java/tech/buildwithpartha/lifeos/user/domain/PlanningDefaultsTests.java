package tech.buildwithpartha.lifeos.user.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class PlanningDefaultsTests {

  @Test
  void standardDefaultsProvideSensibleInitialValues() {
    PlanningDefaults defaults = PlanningDefaults.standardDefaults();
    assertThat(defaults.workingDays()).containsExactly(1, 2, 3, 4, 5);
    assertThat(defaults.workStartTime()).isEmpty();
    assertThat(defaults.workEndTime()).isEmpty();
    assertThat(defaults.overnightSchedule()).isFalse();
    assertThat(defaults.dailyFocusTargetMinutes()).isEmpty();
    assertThat(defaults.focusDurationMinutes()).isEqualTo(25);
    assertThat(defaults.breakDurationMinutes()).isEqualTo(5);
    assertThat(defaults.longBreakDurationMinutes()).isEqualTo(15);
    assertThat(defaults.focusSessionsBeforeLongBreak()).isEqualTo(4);
    assertThat(defaults.autoStartBreaks()).isFalse();
    assertThat(defaults.autoStartFocusSessions()).isFalse();
    assertThat(defaults.soundEnabled()).isFalse();
    assertThat(defaults.browserNotificationsEnabled()).isFalse();
  }

  @Test
  void deduplicatesAndSortsWorkingDays() {
    PlanningDefaults defaults =
        new PlanningDefaults(
            List.of(5, 3, 1, 3, 5),
            Optional.of(LocalTime.of(9, 0)),
            Optional.of(LocalTime.of(17, 0)),
            false,
            Optional.of(120),
            30,
            10);
    assertThat(defaults.workingDays()).containsExactly(1, 3, 5);
  }

  @Test
  void rejectsInvalidWorkingDays() {
    assertThatThrownBy(
            () ->
                new PlanningDefaults(
                    List.of(0, 8),
                    Optional.empty(),
                    Optional.empty(),
                    false,
                    Optional.empty(),
                    25,
                    5))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejectsInvalidFocusAndBreakDurations() {
    assertThatThrownBy(
            () ->
                new PlanningDefaults(
                    List.of(1), Optional.empty(), Optional.empty(), false, Optional.empty(), 0, 5))
        .isInstanceOf(IllegalArgumentException.class);

    assertThatThrownBy(
            () ->
                new PlanningDefaults(
                    List.of(1), Optional.empty(), Optional.empty(), false, Optional.empty(), 25, 0))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejectsUnsafeLongBreakAndCycleBounds() {
    assertThatThrownBy(
            () ->
                new PlanningDefaults(
                    List.of(1),
                    Optional.empty(),
                    Optional.empty(),
                    false,
                    Optional.empty(),
                    25,
                    5,
                    181,
                    4,
                    false,
                    false,
                    false,
                    false))
        .isInstanceOf(IllegalArgumentException.class);

    assertThatThrownBy(
            () ->
                new PlanningDefaults(
                    List.of(1),
                    Optional.empty(),
                    Optional.empty(),
                    false,
                    Optional.empty(),
                    25,
                    5,
                    15,
                    13,
                    false,
                    false,
                    false,
                    false))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
