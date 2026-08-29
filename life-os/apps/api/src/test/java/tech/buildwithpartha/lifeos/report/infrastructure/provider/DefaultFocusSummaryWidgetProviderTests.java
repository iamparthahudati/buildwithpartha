package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.report.application.DailyTimeSummary;
import tech.buildwithpartha.lifeos.report.application.TimeGoalService;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.FocusSummaryWidget;
import tech.buildwithpartha.lifeos.report.domain.FocusComparisonSource;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

class DefaultFocusSummaryWidgetProviderTests {

  @Test
  void mapsCanonicalDailySummaryAndPreservesExplicitEmptyState() {
    UUID userId = UUID.randomUUID();
    LocalDate date = LocalDate.of(2026, 8, 25);
    TimeGoalService service = mock(TimeGoalService.class);
    DefaultFocusSummaryWidgetProvider provider = new DefaultFocusSummaryWidgetProvider(service);
    DailyTimeSummary populated =
        summary(date, 30, 60, FocusComparisonSource.PLANNED_FOCUS_BLOCKS, true);
    given(service.getDailySummary(userId, date, "Asia/Kolkata")).willReturn(populated);

    FocusSummaryWidget result = provider.getWidget(userId, date, ZoneId.of("Asia/Kolkata"));

    assertThat(result.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(result.data().actualFocusMinutesToday()).isEqualTo(30);
    assertThat(result.data().comparisonMinutes()).isEqualTo(60);
    assertThat(result.data().comparisonSource())
        .isEqualTo(FocusComparisonSource.PLANNED_FOCUS_BLOCKS);

    DailyTimeSummary empty = summary(date, 0, null, FocusComparisonSource.NONE, false);
    given(service.getDailySummary(userId, date, "Asia/Kolkata")).willReturn(empty);

    assertThat(provider.getWidget(userId, date, ZoneId.of("Asia/Kolkata")).status())
        .isEqualTo(WidgetStatus.EMPTY);
  }

  private static DailyTimeSummary summary(
      LocalDate date,
      int actualMinutes,
      Integer comparisonMinutes,
      FocusComparisonSource source,
      boolean hasData) {
    return new DailyTimeSummary(
        Instant.parse("2026-08-25T12:00:00Z"),
        date,
        "Asia/Kolkata",
        actualMinutes,
        0,
        actualMinutes,
        0,
        source == FocusComparisonSource.PLANNED_FOCUS_BLOCKS ? comparisonMinutes : 0,
        source == FocusComparisonSource.DAILY_TARGET ? comparisonMinutes : null,
        comparisonMinutes,
        source,
        comparisonMinutes == null ? null : 50,
        false,
        null,
        List.of(),
        hasData);
  }
}
