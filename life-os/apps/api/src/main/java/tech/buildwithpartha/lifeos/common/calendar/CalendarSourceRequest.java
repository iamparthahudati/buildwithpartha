package tech.buildwithpartha.lifeos.common.calendar;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;

/** Owner-scoped, bounded request passed to one Calendar source adapter. */
public record CalendarSourceRequest(
    UUID userId,
    LocalDate startDate,
    LocalDate endDate,
    Instant rangeStart,
    Instant rangeEnd,
    ZoneId zoneId,
    int limit) {

  public CalendarSourceRequest {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(startDate, "startDate must not be null");
    Objects.requireNonNull(endDate, "endDate must not be null");
    Objects.requireNonNull(rangeStart, "rangeStart must not be null");
    Objects.requireNonNull(rangeEnd, "rangeEnd must not be null");
    Objects.requireNonNull(zoneId, "zoneId must not be null");
    if (endDate.isBefore(startDate)) {
      throw new IllegalArgumentException("endDate must not precede startDate");
    }
    if (!rangeEnd.isAfter(rangeStart)) {
      throw new IllegalArgumentException("rangeEnd must be after rangeStart");
    }
    if (limit < 1) {
      throw new IllegalArgumentException("limit must be positive");
    }
  }
}
