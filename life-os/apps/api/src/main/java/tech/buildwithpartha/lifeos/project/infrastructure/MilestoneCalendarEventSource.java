package tech.buildwithpartha.lifeos.project.infrastructure;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.calendar.CalendarEventSource;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceEvent;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceRequest;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceType;

/** Bounded Project-owner-scoped Milestone source for the Calendar projection. */
@Component
public class MilestoneCalendarEventSource implements CalendarEventSource {

  private final MilestoneJpaRepository repository;

  public MilestoneCalendarEventSource(MilestoneJpaRepository repository) {
    this.repository = repository;
  }

  @Override
  public CalendarSourceType sourceType() {
    return CalendarSourceType.MILESTONE;
  }

  @Override
  public List<CalendarSourceEvent> findEvents(CalendarSourceRequest request) {
    return repository
        .findCalendarEvents(
            request.userId(),
            request.startDate(),
            request.endDate(),
            PageRequest.of(0, request.limit()))
        .stream()
        .map(
            milestone ->
                new CalendarSourceEvent(
                    "MILESTONE:" + milestone.getId(),
                    milestone.getId(),
                    sourceType(),
                    milestone.getTitle(),
                    Optional.empty(),
                    Optional.empty(),
                    Optional.ofNullable(milestone.getDate()),
                    true,
                    milestone.getStatus().name(),
                    Optional.of(milestone.getProjectId()),
                    Optional.empty()))
        .toList();
  }
}
