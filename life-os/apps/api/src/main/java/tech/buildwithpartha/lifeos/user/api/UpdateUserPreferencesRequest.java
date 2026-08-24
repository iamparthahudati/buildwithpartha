package tech.buildwithpartha.lifeos.user.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import java.util.List;

public record UpdateUserPreferencesRequest(
    @NotEmpty List<@Min(1) @Max(7) Integer> workingDays,
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$") String workStartTime,
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$") String workEndTime,
    boolean overnightSchedule,
    @Min(1) @Max(1440) Integer dailyFocusTargetMinutes,
    @Min(1) @Max(1440) int focusDurationMinutes,
    @Min(1) @Max(1440) int breakDurationMinutes,
    @Min(1) @Max(180) Integer longBreakDurationMinutes,
    @Min(1) @Max(12) Integer focusSessionsBeforeLongBreak,
    Boolean autoStartBreaks,
    Boolean autoStartFocusSessions,
    Boolean soundEnabled,
    Boolean browserNotificationsEnabled) {}
