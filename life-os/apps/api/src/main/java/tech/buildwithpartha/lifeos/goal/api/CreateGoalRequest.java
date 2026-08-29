package tech.buildwithpartha.lifeos.goal.api;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;

/** Request DTO for creating a new Goal. */
public record CreateGoalRequest(
    @NotBlank(message = "title must not be blank") String title,
    String description,
    @NotBlank(message = "category must not be blank") String category,
    GoalProgressType progressType,
    BigDecimal targetValue,
    BigDecimal currentValue,
    String unit,
    LocalDate targetDate,
    GoalStatus status,
    CheckInCadence checkInCadence) {}
