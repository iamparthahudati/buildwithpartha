package tech.buildwithpartha.lifeos.calendar.application;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceType;

/** Validated input boundary for a Calendar range query. */
public record CalendarQuery(
    UUID userId,
    LocalDate startDate,
    LocalDate endDate,
    ZoneId zoneId,
    Set<CalendarSourceType> sourceTypes,
    int limit) {

  public CalendarQuery {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(startDate, "startDate must not be null");
    Objects.requireNonNull(endDate, "endDate must not be null");
    Objects.requireNonNull(zoneId, "zoneId must not be null");
    Objects.requireNonNull(sourceTypes, "sourceTypes must not be null");
    sourceTypes = Set.copyOf(sourceTypes);
  }
}
