package tech.buildwithpartha.lifeos.user.api;

import java.time.format.DateTimeFormatter;
import java.util.List;
import tech.buildwithpartha.lifeos.user.domain.PlanningDefaults;

public record PlanningDefaultsDto(
    List<Integer> workingDays,
    String workStartTime,
    String workEndTime,
    boolean overnightSchedule,
    Integer dailyFocusTargetMinutes,
    int focusDurationMinutes,
    int breakDurationMinutes,
    int longBreakDurationMinutes,
    int focusSessionsBeforeLongBreak,
    boolean autoStartBreaks,
    boolean autoStartFocusSessions,
    boolean soundEnabled,
    boolean browserNotificationsEnabled) {

  private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

  public static PlanningDefaultsDto fromDomain(PlanningDefaults defaults) {
    return new PlanningDefaultsDto(
        defaults.workingDays(),
        defaults.workStartTime().map(TIME_FORMATTER::format).orElse(null),
        defaults.workEndTime().map(TIME_FORMATTER::format).orElse(null),
        defaults.overnightSchedule(),
        defaults.dailyFocusTargetMinutes().orElse(null),
        defaults.focusDurationMinutes(),
        defaults.breakDurationMinutes(),
        defaults.longBreakDurationMinutes(),
        defaults.focusSessionsBeforeLongBreak(),
        defaults.autoStartBreaks(),
        defaults.autoStartFocusSessions(),
        defaults.soundEnabled(),
        defaults.browserNotificationsEnabled());
  }
}
