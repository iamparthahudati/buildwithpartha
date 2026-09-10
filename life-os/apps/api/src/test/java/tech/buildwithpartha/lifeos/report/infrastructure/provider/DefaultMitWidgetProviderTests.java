package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.focus.FocusActiveTaskPort;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort.TodayProjectSummary;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort.TodayTaskRecord;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.MitWidget;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

class DefaultMitWidgetProviderTests {

  private TodayTaskPort todayTaskPort;
  private ProjectTodayPort projectTodayPort;
  private FocusActiveTaskPort focusActiveTaskPort;
  private DefaultMitWidgetProvider provider;

  @BeforeEach
  void setUp() {
    todayTaskPort = mock(TodayTaskPort.class);
    projectTodayPort = mock(ProjectTodayPort.class);
    focusActiveTaskPort = mock(FocusActiveTaskPort.class);
    provider = new DefaultMitWidgetProvider(todayTaskPort, projectTodayPort, focusActiveTaskPort);
  }

  @Test
  void returnsEmptyWhenNoMitFound() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    given(todayTaskPort.getMitTask(userId, today, zoneId)).willReturn(Optional.empty());

    MitWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(widget.data()).isNull();
    assertThat(widget.error()).isNull();
  }

  @Test
  void returnsMitWithEnrichedProjectAndFocusActive() {
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    TodayTaskRecord record =
        new TodayTaskRecord(
            taskId,
            "Ship Today Aggregation",
            Optional.of(projectId),
            "P1",
            Optional.of(today),
            false,
            false);

    given(todayTaskPort.getMitTask(userId, today, zoneId)).willReturn(Optional.of(record));
    given(projectTodayPort.getProjectSummaries(userId))
        .willReturn(
            Map.of(
                projectId, new TodayProjectSummary(projectId, "LifeOS Core", "#3B82F6", "ACTIVE")));
    given(focusActiveTaskPort.getActiveFocusTaskId(userId)).willReturn(Optional.of(taskId));

    MitWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data()).isNotNull();
    assertThat(widget.data().taskId()).isEqualTo(taskId);
    assertThat(widget.data().title()).isEqualTo("Ship Today Aggregation");
    assertThat(widget.data().projectId()).isEqualTo(projectId);
    assertThat(widget.data().projectName()).isEqualTo("LifeOS Core");
    assertThat(widget.data().projectColor()).isEqualTo("#3B82F6");
    assertThat(widget.data().priority()).isEqualTo("P1");
    assertThat(widget.data().dueDate()).isEqualTo(today);
    assertThat(widget.data().completed()).isFalse();
    assertThat(widget.data().focusActive()).isTrue();
  }
}
