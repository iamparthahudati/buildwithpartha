package tech.buildwithpartha.lifeos.calendar.application;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceEvent;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceType;

/** Deterministically ordered and bounded Calendar query result. */
public record CalendarQueryResult(
    LocalDate startDate,
    LocalDate endDate,
    ZoneId zoneId,
    Set<CalendarSourceType> sourceTypes,
    List<CalendarSourceEvent> events,
    int limit,
    boolean truncated) {

  public CalendarQueryResult {
    sourceTypes = Set.copyOf(sourceTypes);
    events = List.copyOf(events);
  }
}
