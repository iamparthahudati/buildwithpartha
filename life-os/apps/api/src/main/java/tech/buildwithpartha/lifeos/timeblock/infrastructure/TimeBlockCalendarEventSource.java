package tech.buildwithpartha.lifeos.timeblock.infrastructure;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.calendar.CalendarEventSource;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceEvent;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceRequest;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceType;

/** Bounded owner-scoped Time Block source for the Calendar projection. */
@Component
public class TimeBlockCalendarEventSource implements CalendarEventSource {

  private final TimeBlockJpaRepository repository;

  public TimeBlockCalendarEventSource(TimeBlockJpaRepository repository) {
    this.repository = repository;
  }

  @Override
  public CalendarSourceType sourceType() {
    return CalendarSourceType.TIME_BLOCK;
  }

  @Override
  public List<CalendarSourceEvent> findEvents(CalendarSourceRequest request) {
    return repository
        .findCalendarEvents(
            request.userId(),
            request.rangeStart(),
            request.rangeEnd(),
            PageRequest.of(0, request.limit()))
        .stream()
        .map(
            block ->
                new CalendarSourceEvent(
                    "TIME_BLOCK:" + block.getId(),
                    block.getId(),
                    sourceType(),
                    block.getTitle(),
                    Optional.of(block.getStartAt()),
                    Optional.of(block.getEndAt()),
                    Optional.empty(),
                    false,
                    block.getStatus().name(),
                    Optional.ofNullable(block.getProjectId()),
                    Optional.ofNullable(block.getTaskId())))
        .toList();
  }
}
