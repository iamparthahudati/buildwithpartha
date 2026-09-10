package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.sprint.SprintTodayPort;
import tech.buildwithpartha.lifeos.common.sprint.SprintTodayPort.TodaySprintSummary;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.SprintWidget;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

class DefaultSprintWidgetProviderTests {

  private SprintTodayPort sprintTodayPort;
  private DefaultSprintWidgetProvider provider;

  @BeforeEach
  void setUp() {
    sprintTodayPort = mock(SprintTodayPort.class);
    provider = new DefaultSprintWidgetProvider(sprintTodayPort);
  }

  @Test
  void returnsEmptyWhenNoActiveSprint() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    given(sprintTodayPort.getActiveSprint(userId, today)).willReturn(Optional.empty());

    SprintWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(widget.data()).isNull();
  }

  @Test
  void returnsActiveSprintSummary() {
    UUID userId = UUID.randomUUID();
    UUID sprintId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    TodaySprintSummary summary =
        new TodaySprintSummary(
            sprintId, "Sprint 24", 15, 30, today.minusDays(3), today.plusDays(4));

    given(sprintTodayPort.getActiveSprint(userId, today)).willReturn(Optional.of(summary));

    SprintWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data()).isNotNull();
    assertThat(widget.data().sprintId()).isEqualTo(sprintId);
    assertThat(widget.data().name()).isEqualTo("Sprint 24");
    assertThat(widget.data().completedStoryPoints()).isEqualTo(15);
    assertThat(widget.data().totalStoryPoints()).isEqualTo(30);
  }
}
