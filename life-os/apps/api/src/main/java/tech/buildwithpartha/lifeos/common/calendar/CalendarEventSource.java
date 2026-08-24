package tech.buildwithpartha.lifeos.common.calendar;

import java.util.List;

/** Adapter contract for contributing one canonical record type to Calendar. */
public interface CalendarEventSource {

  CalendarSourceType sourceType();

  List<CalendarSourceEvent> findEvents(CalendarSourceRequest request);
}
