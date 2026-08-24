package tech.buildwithpartha.lifeos.calendar.api;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import tech.buildwithpartha.lifeos.calendar.application.CalendarQueryResult;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceType;

/** Bounded Calendar response with the exact interpreted local-date range and filters. */
public record CalendarResponse(
    LocalDate startDate,
    LocalDate endDate,
    String timeZone,
    Set<CalendarSourceType> sources,
    List<CalendarEventResponse> events,
    int limit,
    boolean truncated) {

  static CalendarResponse fromApplication(CalendarQueryResult result) {
    return new CalendarResponse(
        result.startDate(),
        result.endDate(),
        result.zoneId().getId(),
        result.sourceTypes(),
        result.events().stream().map(CalendarEventResponse::fromCommon).toList(),
        result.limit(),
        result.truncated());
  }
}
