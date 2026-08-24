package tech.buildwithpartha.lifeos.report.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.OptionalInt;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.time.DailyFocusTargetProvider;
import tech.buildwithpartha.lifeos.common.time.FocusTimeSummary;
import tech.buildwithpartha.lifeos.common.time.FocusTimeSummaryProvider;
import tech.buildwithpartha.lifeos.common.time.TimeBlockCategoryMinutes;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTimeSummary;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTimeSummaryProvider;
import tech.buildwithpartha.lifeos.report.domain.FocusComparisonSource;

class TimeGoalServiceTests {

  private static final Instant NOW = Instant.parse("2026-03-08T16:00:00Z");

  private DailyFocusTargetProvider targetProvider;
  private FocusTimeSummaryProvider focusProvider;
  private TimeBlockTimeSummaryProvider blockProvider;
  private TimeGoalService service;

  @BeforeEach
  void setUp() {
    targetProvider = mock(DailyFocusTargetProvider.class);
    focusProvider = mock(FocusTimeSummaryProvider.class);
    blockProvider = mock(TimeBlockTimeSummaryProvider.class);
    service =
        new TimeGoalService(
            targetProvider, focusProvider, blockProvider, Clock.fixed(NOW, ZoneOffset.UTC));

    given(focusProvider.summarize(any(), any(), any(), any()))
        .willReturn(new FocusTimeSummary(0, 0, 0, false, null));
    given(blockProvider.summarize(any(), any(), any()))
        .willReturn(new TimeBlockTimeSummary(0, 0, List.of()));
    given(targetProvider.getDailyFocusTargetMinutes(any())).willReturn(OptionalInt.empty());
  }

  @Test
  void usesExactDstLocalDayBoundariesAndPlannedBlocksBeforeTheDailyTarget() {
    UUID userId = UUID.randomUUID();
    given(focusProvider.summarize(any(), any(), any(), any()))
        .willReturn(new FocusTimeSummary(75, 10, 20, true, "5:00"));
    given(blockProvider.summarize(any(), any(), any()))
        .willReturn(
            new TimeBlockTimeSummary(60, 30, List.of(new TimeBlockCategoryMinutes("Focus", 60))));
    given(targetProvider.getDailyFocusTargetMinutes(userId)).willReturn(OptionalInt.of(120));

    DailyTimeSummary result =
        service.getDailySummary(userId, LocalDate.of(2026, 3, 8), "America/New_York");

    ArgumentCaptor<Instant> start = ArgumentCaptor.forClass(Instant.class);
    ArgumentCaptor<Instant> end = ArgumentCaptor.forClass(Instant.class);
    verify(blockProvider).summarize(any(), start.capture(), end.capture());
    assertThat(start.getValue()).isEqualTo(Instant.parse("2026-03-08T05:00:00Z"));
    assertThat(end.getValue()).isEqualTo(Instant.parse("2026-03-09T04:00:00Z"));
    assertThat(result.actualFocusMinutes()).isEqualTo(75);
    assertThat(result.plannedFocusMinutes()).isEqualTo(60);
    assertThat(result.dailyFocusTargetMinutes()).isEqualTo(120);
    assertThat(result.comparisonSource()).isEqualTo(FocusComparisonSource.PLANNED_FOCUS_BLOCKS);
    assertThat(result.comparisonMinutes()).isEqualTo(60);
    assertThat(result.progressPercentage()).isEqualTo(125);
    assertThat(result.hasData()).isTrue();
  }

  @Test
  void fallsBackToTheOptionalTargetAndKeepsNoDenominatorTrulyEmpty() {
    UUID userId = UUID.randomUUID();
    given(targetProvider.getDailyFocusTargetMinutes(userId)).willReturn(OptionalInt.of(90));

    DailyTimeSummary targetResult =
        service.getDailySummary(userId, LocalDate.of(2026, 8, 25), "Asia/Kolkata");

    assertThat(targetResult.comparisonSource()).isEqualTo(FocusComparisonSource.DAILY_TARGET);
    assertThat(targetResult.comparisonMinutes()).isEqualTo(90);
    assertThat(targetResult.progressPercentage()).isZero();
    assertThat(targetResult.hasData()).isTrue();

    given(targetProvider.getDailyFocusTargetMinutes(userId)).willReturn(OptionalInt.empty());
    DailyTimeSummary empty =
        service.getDailySummary(userId, LocalDate.of(2026, 8, 25), "Asia/Kolkata");

    assertThat(empty.comparisonSource()).isEqualTo(FocusComparisonSource.NONE);
    assertThat(empty.comparisonMinutes()).isNull();
    assertThat(empty.progressPercentage()).isNull();
    assertThat(empty.hasData()).isFalse();
  }

  @Test
  void rejectsAnInvalidTimeZoneWithSafeFieldMetadata() {
    assertThatThrownBy(
            () ->
                service.getDailySummary(
                    UUID.randomUUID(), LocalDate.of(2026, 8, 25), "Not/A_Timezone"))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            exception ->
                assertThat(((FieldValidationException) exception).errors())
                    .extracting("field", "code")
                    .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("timeZone", "INVALID_TIMEZONE")));
  }
}
