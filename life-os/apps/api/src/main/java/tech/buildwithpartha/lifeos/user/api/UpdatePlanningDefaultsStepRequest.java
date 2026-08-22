package tech.buildwithpartha.lifeos.user.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.util.List;

public record UpdatePlanningDefaultsStepRequest(
    List<@Min(1) @Max(7) Integer> workingDays,
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$") String workStartTime,
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$") String workEndTime,
    Boolean overnightSchedule,
    @Min(1) @Max(1440) Integer dailyFocusTargetMinutes,
    @Min(1) @Max(1440) Integer focusDurationMinutes,
    @Min(1) @Max(1440) Integer breakDurationMinutes,
    boolean skipped) {}
