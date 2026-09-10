package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort.TodayProjectSummary;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTodayPort;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTodayPort.TodayTimeBlockRecord;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.CurrentNextBlockWidget;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

class DefaultCurrentNextBlockWidgetProviderTests {

  private TimeBlockTodayPort timeBlockTodayPort;
  private ProjectTodayPort projectTodayPort;
  private Clock clock;
  private DefaultCurrentNextBlockWidgetProvider provider;

  @BeforeEach
  void setUp() {
    timeBlockTodayPort = mock(TimeBlockTodayPort.class);
    projectTodayPort = mock(ProjectTodayPort.class);
    clock = Clock.fixed(Instant.parse("2026-09-10T10:30:00Z"), ZoneId.of("UTC"));
    provider =
        new DefaultCurrentNextBlockWidgetProvider(timeBlockTodayPort, projectTodayPort, clock);
  }

  @Test
  void returnsEmptyWhenNoCurrentOrNextBlocks() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");
    Instant start = today.atStartOfDay(zoneId).toInstant();
    Instant end = today.plusDays(1).atStartOfDay(zoneId).toInstant();

    given(timeBlockTodayPort.getTodayTimeBlocks(userId, start, end, zoneId)).willReturn(List.of());

    CurrentNextBlockWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(widget.data()).isNull();
  }

  @Test
  void returnsCurrentOnlyWhenNoUpcomingBlock() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");
    Instant start = today.atStartOfDay(zoneId).toInstant();
    Instant end = today.plusDays(1).atStartOfDay(zoneId).toInstant();

    UUID currentId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();

    TodayTimeBlockRecord current =
        new TodayTimeBlockRecord(
            currentId,
            "Focus Session",
            LocalTime.of(10, 0),
            LocalTime.of(11, 0),
            "DEEP_WORK",
            Optional.of(projectId),
            false,
            start.plusSeconds(10 * 3600),
            start.plusSeconds(11 * 3600));

    given(timeBlockTodayPort.getTodayTimeBlocks(userId, start, end, zoneId))
        .willReturn(List.of(current));
    given(projectTodayPort.getProjectSummaries(userId))
        .willReturn(
            Map.of(projectId, new TodayProjectSummary(projectId, "LifeOS", "#fff", "ACTIVE")));

    CurrentNextBlockWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data().current()).isNotNull();
    assertThat(widget.data().current().projectName()).isEqualTo("LifeOS");
    assertThat(widget.data().next()).isNull();
  }

  @Test
  void returnsNextOnlyWhenNoActiveCurrentBlock() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");
    Instant start = today.atStartOfDay(zoneId).toInstant();
    Instant end = today.plusDays(1).atStartOfDay(zoneId).toInstant();

    UUID nextId = UUID.randomUUID();

    TodayTimeBlockRecord next =
        new TodayTimeBlockRecord(
            nextId,
            "Future Meeting",
            LocalTime.of(14, 0),
            LocalTime.of(15, 0),
            "MEETING",
            Optional.empty(),
            false,
            start.plusSeconds(14 * 3600),
            start.plusSeconds(15 * 3600));

    given(timeBlockTodayPort.getTodayTimeBlocks(userId, start, end, zoneId))
        .willReturn(List.of(next));
    given(projectTodayPort.getProjectSummaries(userId)).willReturn(Map.of());

    CurrentNextBlockWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data().current()).isNull();
    assertThat(widget.data().next()).isNotNull();
    assertThat(widget.data().next().title()).isEqualTo("Future Meeting");
  }
}
