package tech.buildwithpartha.lifeos.habit.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * A date range during which a habit is paused and excluded from streak eligibility. An empty {@link
 * #endDate} means the pause is open-ended (still active).
 */
public record HabitPausePeriod(
    UUID id,
    UUID habitId,
    UUID userId,
    LocalDate startDate,
    Optional<LocalDate> endDate,
    Optional<String> reason,
    Instant createdAt) {

  public HabitPausePeriod {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(habitId, "habitId must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(startDate, "startDate must not be null");
    Objects.requireNonNull(endDate, "endDate must not be null");
    Objects.requireNonNull(reason, "reason must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");

    endDate.ifPresent(
        end -> {
          if (end.isBefore(startDate)) {
            throw new IllegalArgumentException(
                "HabitPausePeriod endDate must not precede startDate");
          }
        });
  }

  public boolean isOwnedBy(UUID candidateUserId) {
    return userId.equals(candidateUserId);
  }

  /** Whether the given local date falls within this pause period (inclusive bounds). */
  public boolean covers(LocalDate date) {
    Objects.requireNonNull(date, "date must not be null");
    if (date.isBefore(startDate)) {
      return false;
    }
    return endDate.map(end -> !date.isAfter(end)).orElse(true);
  }
}
