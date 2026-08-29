package tech.buildwithpartha.lifeos.calendar.application;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.calendar.CalendarEventSource;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceEvent;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceRequest;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceType;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;

/** Aggregates owner-scoped canonical records into one bounded Calendar projection. */
@Service
public class CalendarService {

  public static final int MAX_RANGE_DAYS = 62;
  public static final int MAX_RESULTS = 500;

  private final Map<CalendarSourceType, CalendarEventSource> sources;

  public CalendarService(List<CalendarEventSource> sources) {
    this.sources = new EnumMap<>(CalendarSourceType.class);
    for (CalendarEventSource source : sources) {
      CalendarEventSource previous = this.sources.put(source.sourceType(), source);
      if (previous != null) {
        throw new IllegalStateException("Duplicate Calendar source: " + source.sourceType());
      }
    }
  }

  @Transactional(readOnly = true)
  public CalendarQueryResult query(CalendarQuery query) {
    validate(query);

    Instant rangeStart = query.startDate().atStartOfDay(query.zoneId()).toInstant();
    Instant rangeEnd = query.endDate().plusDays(1).atStartOfDay(query.zoneId()).toInstant();
    CalendarSourceRequest sourceRequest =
        new CalendarSourceRequest(
            query.userId(),
            query.startDate(),
            query.endDate(),
            rangeStart,
            rangeEnd,
            query.zoneId(),
            query.limit() + 1);

    List<CalendarSourceEvent> merged = new ArrayList<>();
    query.sourceTypes().stream()
        .sorted()
        .map(sources::get)
        .filter(java.util.Objects::nonNull)
        .forEach(source -> merged.addAll(source.findEvents(sourceRequest)));

    merged.sort(eventComparator(query));
    boolean truncated = merged.size() > query.limit();
    List<CalendarSourceEvent> events =
        truncated ? List.copyOf(merged.subList(0, query.limit())) : List.copyOf(merged);

    return new CalendarQueryResult(
        query.startDate(),
        query.endDate(),
        query.zoneId(),
        query.sourceTypes(),
        events,
        query.limit(),
        truncated);
  }

  private static Comparator<CalendarSourceEvent> eventComparator(CalendarQuery query) {
    return Comparator.comparing((CalendarSourceEvent event) -> effectiveStart(event, query))
        .thenComparing(CalendarSourceEvent::allDay, Comparator.reverseOrder())
        .thenComparing(CalendarSourceEvent::sourceType)
        .thenComparing(CalendarSourceEvent::id);
  }

  private static Instant effectiveStart(CalendarSourceEvent event, CalendarQuery query) {
    if (event.localDate().isPresent()) {
      return event.localDate().orElseThrow().atStartOfDay(query.zoneId()).toInstant();
    }
    return event.startAt().orElseThrow();
  }

  private static void validate(CalendarQuery query) {
    List<FieldProblem> errors = new ArrayList<>();
    if (query.endDate().isBefore(query.startDate())) {
      errors.add(new FieldProblem("endDate", "BEFORE_START_DATE"));
    } else if (ChronoUnit.DAYS.between(query.startDate(), query.endDate()) + 1 > MAX_RANGE_DAYS) {
      errors.add(new FieldProblem("endDate", "RANGE_TOO_LARGE"));
    }
    if (query.sourceTypes().isEmpty()) {
      errors.add(new FieldProblem("source", "REQUIRED"));
    }
    if (query.limit() < 1 || query.limit() > MAX_RESULTS) {
      errors.add(new FieldProblem("limit", "OUT_OF_RANGE"));
    }
    if (!errors.isEmpty()) {
      throw new FieldValidationException("Invalid Calendar query", errors);
    }
  }
}
