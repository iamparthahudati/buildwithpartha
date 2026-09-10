package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

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
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ScheduleWidget;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

class DefaultScheduleWidgetProviderTests {

  private TimeBlockTodayPort timeBlockTodayPort;
  private ProjectTodayPort projectTodayPort;
  private DefaultScheduleWidgetProvider provider;

  @BeforeEach
  void setUp() {
    timeBlockTodayPort = mock(TimeBlockTodayPort.class);
    projectTodayPort = mock(ProjectTodayPort.class);
    provider = new DefaultScheduleWidgetProvider(timeBlockTodayPort, projectTodayPort);
  }

  @Test
  void returnsEmptyWhenNoBlocksScheduled() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");
    Instant start = today.atStartOfDay(zoneId).toInstant();
    Instant end = today.plusDays(1).atStartOfDay(zoneId).toInstant();

    given(timeBlockTodayPort.getTodayTimeBlocks(userId, start, end, zoneId)).willReturn(List.of());

    ScheduleWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(widget.data().blocks()).isEmpty();
    assertThat(widget.data().conflicts()).isEmpty();
  }

  @Test
  void returnsScheduleBlocksWithoutConflicts() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");
    Instant start = today.atStartOfDay(zoneId).toInstant();
    Instant end = today.plusDays(1).atStartOfDay(zoneId).toInstant();

    TodayTimeBlockRecord block =
        new TodayTimeBlockRecord(
            UUID.randomUUID(),
            "Morning Block",
            LocalTime.of(8, 0),
            LocalTime.of(9, 0),
            "ROUTINE",
            Optional.empty(),
            true,
            start.plusSeconds(8 * 3600),
            start.plusSeconds(9 * 3600));

    given(timeBlockTodayPort.getTodayTimeBlocks(userId, start, end, zoneId))
        .willReturn(List.of(block));
    given(projectTodayPort.getProjectSummaries(userId)).willReturn(Map.of());

    ScheduleWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data().blocks()).hasSize(1);
    assertThat(widget.data().blocks().get(0).completed()).isTrue();
    assertThat(widget.data().blocks().get(0).projectName()).isNull();
    assertThat(widget.data().conflicts()).isEmpty();
  }

  @Test
  void returnsScheduleBlocksAndDetectsConflicts() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");
    Instant start = today.atStartOfDay(zoneId).toInstant();
    Instant end = today.plusDays(1).atStartOfDay(zoneId).toInstant();

    UUID block1Id = UUID.randomUUID();
    UUID block2Id = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();

    TodayTimeBlockRecord block1 =
        new TodayTimeBlockRecord(
            block1Id,
            "Deep Work",
            LocalTime.of(9, 0),
            LocalTime.of(11, 0),
            "DEEP_WORK",
            Optional.of(projectId),
            false,
            start.plusSeconds(9 * 3600),
            start.plusSeconds(11 * 3600));

    TodayTimeBlockRecord block2 =
        new TodayTimeBlockRecord(
            block2Id,
            "Team Sync",
            LocalTime.of(10, 0),
            LocalTime.of(11, 30),
            "MEETING",
            Optional.empty(),
            false,
            start.plusSeconds(10 * 3600),
            start.plusSeconds(11 * 3600 + 1800));

    given(timeBlockTodayPort.getTodayTimeBlocks(userId, start, end, zoneId))
        .willReturn(List.of(block1, block2));
    given(projectTodayPort.getProjectSummaries(userId))
        .willReturn(
            Map.of(
                projectId,
                new TodayProjectSummary(projectId, "Architecture", "#6366F1", "ACTIVE")));

    ScheduleWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data().blocks()).hasSize(2);
    assertThat(widget.data().blocks().get(0).projectName()).isEqualTo("Architecture");
    assertThat(widget.data().conflicts()).hasSize(1);
    assertThat(widget.data().conflicts().get(0).firstBlockId()).isEqualTo(block1Id);
    assertThat(widget.data().conflicts().get(0).secondBlockId()).isEqualTo(block2Id);
  }
}
