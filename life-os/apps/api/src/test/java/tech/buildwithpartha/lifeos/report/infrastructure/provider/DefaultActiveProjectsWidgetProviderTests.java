package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort.TodayProjectSummary;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort.ProjectTaskCountRecord;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ActiveProjectsWidget;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

class DefaultActiveProjectsWidgetProviderTests {

  private ProjectTodayPort projectTodayPort;
  private TodayTaskPort todayTaskPort;
  private DefaultActiveProjectsWidgetProvider provider;

  @BeforeEach
  void setUp() {
    projectTodayPort = mock(ProjectTodayPort.class);
    todayTaskPort = mock(TodayTaskPort.class);
    provider = new DefaultActiveProjectsWidgetProvider(projectTodayPort, todayTaskPort);
  }

  @Test
  void returnsEmptyWhenNoActiveProjects() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    given(projectTodayPort.getActiveProjects(userId, 5)).willReturn(List.of());

    ActiveProjectsWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(widget.data().projects()).isEmpty();
  }

  @Test
  void returnsActiveProjectsWithTaskCounts() {
    UUID userId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    TodayProjectSummary project =
        new TodayProjectSummary(projectId, "Website Redesign", "#3B82F6", "ACTIVE");

    given(projectTodayPort.getActiveProjects(userId, 5)).willReturn(List.of(project));
    given(todayTaskPort.getProjectTaskCounts(userId))
        .willReturn(Map.of(projectId, new ProjectTaskCountRecord(3, 7)));

    ActiveProjectsWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data().projects()).hasSize(1);
    assertThat(widget.data().projects().get(0).name()).isEqualTo("Website Redesign");
    assertThat(widget.data().projects().get(0).completedTasksCount()).isEqualTo(3);
    assertThat(widget.data().projects().get(0).totalTasksCount()).isEqualTo(7);
  }
}
