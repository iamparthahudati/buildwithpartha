package tech.buildwithpartha.lifeos.task.infrastructure;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.calendar.CalendarEventSource;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceEvent;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceRequest;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceType;

/** Bounded owner-scoped due Task source for the Calendar projection. */
@Component
public class TaskDueCalendarEventSource implements CalendarEventSource {

  private final TaskJpaRepository repository;

  public TaskDueCalendarEventSource(TaskJpaRepository repository) {
    this.repository = repository;
  }

  @Override
  public CalendarSourceType sourceType() {
    return CalendarSourceType.TASK_DUE;
  }

  @Override
  public List<CalendarSourceEvent> findEvents(CalendarSourceRequest request) {
    return repository
        .findCalendarDueEvents(
            request.userId(),
            request.rangeStart(),
            request.rangeEnd(),
            PageRequest.of(0, request.limit()))
        .stream()
        .map(
            task ->
                new CalendarSourceEvent(
                    "TASK_DUE:" + task.getId(),
                    task.getId(),
                    sourceType(),
                    task.getTitle(),
                    Optional.of(task.getDueAt()),
                    Optional.empty(),
                    Optional.empty(),
                    false,
                    task.getStatus().name(),
                    Optional.ofNullable(task.getProjectId()),
                    Optional.of(task.getId())))
        .toList();
  }
}
