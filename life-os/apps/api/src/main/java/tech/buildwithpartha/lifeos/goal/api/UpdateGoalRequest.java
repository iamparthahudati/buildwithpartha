package tech.buildwithpartha.lifeos.goal.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;

/** Request DTO for updating an existing Goal. */
public record UpdateGoalRequest(
    @NotBlank(message = "title must not be blank") String title,
    String description,
    @NotBlank(message = "category must not be blank") String category,
    GoalProgressType progressType,
    BigDecimal targetValue,
    BigDecimal currentValue,
    String unit,
    LocalDate targetDate,
    CheckInCadence checkInCadence,
    @NotNull(message = "version is required") Long version) {}
