package tech.buildwithpartha.lifeos.habit.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriod;

/** Response DTO representing a habit pause period (LOS-1209). */
public record HabitPausePeriodResponse(
    UUID id,
    UUID habitId,
    UUID userId,
    LocalDate startDate,
    Optional<LocalDate> endDate,
    Optional<String> reason,
    Instant createdAt) {

  public static HabitPausePeriodResponse fromDomain(HabitPausePeriod domain) {
    Objects.requireNonNull(domain, "domain must not be null");
    return new HabitPausePeriodResponse(
        domain.id(),
        domain.habitId(),
        domain.userId(),
        domain.startDate(),
        domain.endDate(),
        domain.reason(),
        domain.createdAt());
  }
}
