package tech.buildwithpartha.lifeos.calendar.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.calendar.CalendarEventSource;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceEvent;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceRequest;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceType;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;

class CalendarServiceTests {

  private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

  @Test
  void aggregatesSelectedSourcesInStableOrderAndUsesDstSafeBoundaries() {
    List<CalendarSourceRequest> capturedRequests = new ArrayList<>();
    CalendarEventSource blocks =
        source(
            CalendarSourceType.TIME_BLOCK,
            capturedRequests,
            List.of(timed(CalendarSourceType.TIME_BLOCK, "TIME_BLOCK:b", "2026-03-08T13:00:00Z")));
    CalendarEventSource milestones =
        source(
            CalendarSourceType.MILESTONE,
            capturedRequests,
            List.of(allDay("MILESTONE:a", LocalDate.of(2026, 3, 8))));
    CalendarEventSource tasks =
        source(
            CalendarSourceType.TASK_DUE,
            capturedRequests,
            List.of(timed(CalendarSourceType.TASK_DUE, "TASK_DUE:c", "2026-03-08T13:00:00Z")));

    CalendarService service = new CalendarService(List.of(blocks, milestones, tasks));
    CalendarQueryResult result =
        service.query(
            new CalendarQuery(
                USER_ID,
                LocalDate.of(2026, 3, 8),
                LocalDate.of(2026, 3, 8),
                ZoneId.of("America/New_York"),
                EnumSet.allOf(CalendarSourceType.class),
                10));

    assertThat(result.events())
        .extracting(CalendarSourceEvent::id)
        .containsExactly("MILESTONE:a", "TIME_BLOCK:b", "TASK_DUE:c");
    assertThat(result.truncated()).isFalse();
    assertThat(capturedRequests).hasSize(3);
    assertThat(capturedRequests)
        .allSatisfy(
            request -> {
              assertThat(request.userId()).isEqualTo(USER_ID);
              assertThat(request.rangeStart()).isEqualTo(Instant.parse("2026-03-08T05:00:00Z"));
              assertThat(request.rangeEnd()).isEqualTo(Instant.parse("2026-03-09T04:00:00Z"));
              assertThat(request.limit()).isEqualTo(11);
            });
  }

  @Test
  void omitsUnselectedSourcesAndCapsTheMergedResult() {
    List<CalendarSourceEvent> events =
        List.of(
            timed(CalendarSourceType.TASK_DUE, "TASK_DUE:3", "2026-08-24T12:00:00Z"),
            timed(CalendarSourceType.TASK_DUE, "TASK_DUE:1", "2026-08-24T10:00:00Z"),
            timed(CalendarSourceType.TASK_DUE, "TASK_DUE:2", "2026-08-24T11:00:00Z"));
    CalendarService service =
        new CalendarService(
            List.of(
                source(CalendarSourceType.TASK_DUE, new ArrayList<>(), events),
                source(
                    CalendarSourceType.TIME_BLOCK,
                    new ArrayList<>(),
                    List.of(
                        timed(
                            CalendarSourceType.TIME_BLOCK,
                            "TIME_BLOCK:ignored",
                            "2026-08-24T09:00:00Z")))));

    CalendarQueryResult result =
        service.query(
            query(
                LocalDate.of(2026, 8, 24),
                LocalDate.of(2026, 8, 24),
                Set.of(CalendarSourceType.TASK_DUE),
                2));

    assertThat(result.events())
        .extracting(CalendarSourceEvent::id)
        .containsExactly("TASK_DUE:1", "TASK_DUE:2");
    assertThat(result.truncated()).isTrue();
    assertThat(result.sourceTypes()).containsExactly(CalendarSourceType.TASK_DUE);
  }

  @Test
  void validatesRangeSourcesAndLimitWithoutExposingValues() {
    CalendarService service = new CalendarService(List.of());

    assertThatThrownBy(
            () ->
                service.query(
                    query(
                        LocalDate.of(2026, 8, 25),
                        LocalDate.of(2026, 8, 24),
                        Set.of(CalendarSourceType.TIME_BLOCK),
                        1)))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            error ->
                assertThat(((FieldValidationException) error).errors())
                    .extracting(problem -> problem.field() + ":" + problem.code())
                    .containsExactly("endDate:BEFORE_START_DATE"));

    assertThatThrownBy(
            () ->
                service.query(
                    query(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 4), Set.of(), 501)))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            error ->
                assertThat(((FieldValidationException) error).errors())
                    .extracting(problem -> problem.field() + ":" + problem.code())
                    .containsExactly(
                        "endDate:RANGE_TOO_LARGE", "source:REQUIRED", "limit:OUT_OF_RANGE"));
  }

  @Test
  void rejectsDuplicateAdaptersAndInvalidCommonProjections() {
    CalendarEventSource first = source(CalendarSourceType.REVIEW, new ArrayList<>(), List.of());
    CalendarEventSource second = source(CalendarSourceType.REVIEW, new ArrayList<>(), List.of());

    assertThatThrownBy(() -> new CalendarService(List.of(first, second)))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("REVIEW");
    assertThatThrownBy(
            () ->
                new CalendarSourceEvent(
                    "HABIT:x",
                    UUID.randomUUID(),
                    CalendarSourceType.HABIT,
                    "Habit",
                    Optional.empty(),
                    Optional.empty(),
                    Optional.empty(),
                    true,
                    "ACTIVE",
                    Optional.empty(),
                    Optional.empty()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("localDate");
  }

  private static CalendarQuery query(
      LocalDate startDate, LocalDate endDate, Set<CalendarSourceType> sources, int limit) {
    return new CalendarQuery(USER_ID, startDate, endDate, ZoneId.of("UTC"), sources, limit);
  }

  private static CalendarEventSource source(
      CalendarSourceType type,
      List<CalendarSourceRequest> capturedRequests,
      List<CalendarSourceEvent> events) {
    return new CalendarEventSource() {
      @Override
      public CalendarSourceType sourceType() {
        return type;
      }

      @Override
      public List<CalendarSourceEvent> findEvents(CalendarSourceRequest request) {
        capturedRequests.add(request);
        return events;
      }
    };
  }

  private static CalendarSourceEvent timed(CalendarSourceType type, String id, String startAt) {
    UUID sourceId = UUID.nameUUIDFromBytes(id.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    return new CalendarSourceEvent(
        id,
        sourceId,
        type,
        id,
        Optional.of(Instant.parse(startAt)),
        Optional.empty(),
        Optional.empty(),
        false,
        "PLANNED",
        Optional.empty(),
        Optional.empty());
  }

  private static CalendarSourceEvent allDay(String id, LocalDate localDate) {
    UUID sourceId = UUID.nameUUIDFromBytes(id.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    return new CalendarSourceEvent(
        id,
        sourceId,
        CalendarSourceType.MILESTONE,
        id,
        Optional.empty(),
        Optional.empty(),
        Optional.of(localDate),
        true,
        "PLANNED",
        Optional.empty(),
        Optional.empty());
  }
}
