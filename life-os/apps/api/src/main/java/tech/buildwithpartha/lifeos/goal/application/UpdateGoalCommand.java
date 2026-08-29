package tech.buildwithpartha.lifeos.goal.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;

/** Command carrier for updating an existing Goal aggregate with optimistic concurrency check. */
public record UpdateGoalCommand(
    String title,
    Optional<String> description,
    String category,
    GoalProgressType progressType,
    Optional<BigDecimal> targetValue,
    BigDecimal currentValue,
    Optional<String> unit,
    Optional<LocalDate> targetDate,
    CheckInCadence checkInCadence,
    long version) {

  public UpdateGoalCommand {
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(description, "description must not be null");
    Objects.requireNonNull(category, "category must not be null");
    Objects.requireNonNull(progressType, "progressType must not be null");
    Objects.requireNonNull(targetValue, "targetValue must not be null");
    Objects.requireNonNull(currentValue, "currentValue must not be null");
    Objects.requireNonNull(unit, "unit must not be null");
    Objects.requireNonNull(targetDate, "targetDate must not be null");
    Objects.requireNonNull(checkInCadence, "checkInCadence must not be null");
    if (version < 0) {
      throw new IllegalArgumentException("version must not be negative");
    }
  }
}
