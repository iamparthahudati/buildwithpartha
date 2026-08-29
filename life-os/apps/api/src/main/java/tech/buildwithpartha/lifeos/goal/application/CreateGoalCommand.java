package tech.buildwithpartha.lifeos.goal.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;

/** Command carrier for creating a new Goal aggregate. */
public record CreateGoalCommand(
    String title,
    Optional<String> description,
    String category,
    GoalProgressType progressType,
    Optional<BigDecimal> targetValue,
    BigDecimal currentValue,
    Optional<String> unit,
    Optional<LocalDate> targetDate,
    GoalStatus status,
    CheckInCadence checkInCadence) {

  public CreateGoalCommand {
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(description, "description must not be null");
    Objects.requireNonNull(category, "category must not be null");
    Objects.requireNonNull(progressType, "progressType must not be null");
    Objects.requireNonNull(targetValue, "targetValue must not be null");
    Objects.requireNonNull(currentValue, "currentValue must not be null");
    Objects.requireNonNull(unit, "unit must not be null");
    Objects.requireNonNull(targetDate, "targetDate must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(checkInCadence, "checkInCadence must not be null");
  }
}
