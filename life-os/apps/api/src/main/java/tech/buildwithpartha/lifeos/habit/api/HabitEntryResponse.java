package tech.buildwithpartha.lifeos.habit.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;

/** Response DTO representing a dated habit completion entry (LOS-1209). */
public record HabitEntryResponse(
    UUID id,
    UUID habitId,
    UUID userId,
    LocalDate localDate,
    int completedCount,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static HabitEntryResponse fromDomain(HabitEntry domain) {
    Objects.requireNonNull(domain, "domain must not be null");
    return new HabitEntryResponse(
        domain.id(),
        domain.habitId(),
        domain.userId(),
        domain.localDate(),
        domain.completedCount(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }
}
