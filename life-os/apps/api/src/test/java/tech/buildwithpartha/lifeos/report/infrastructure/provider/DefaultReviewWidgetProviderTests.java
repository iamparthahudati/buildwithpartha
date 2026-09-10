package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.sprint.ReviewTodayPort;
import tech.buildwithpartha.lifeos.common.sprint.ReviewTodayPort.TodayReviewSummary;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ReviewWidget;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

class DefaultReviewWidgetProviderTests {

  private ReviewTodayPort reviewTodayPort;
  private DefaultReviewWidgetProvider provider;

  @BeforeEach
  void setUp() {
    reviewTodayPort = mock(ReviewTodayPort.class);
    provider = new DefaultReviewWidgetProvider(reviewTodayPort);
  }

  @Test
  void returnsEmptyWhenNoReviewActivity() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    given(reviewTodayPort.getTodayReview(userId, today))
        .willReturn(new TodayReviewSummary(false, false, "NOT_STARTED", "NOT_STARTED"));

    ReviewWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(widget.data().morningReviewCompleted()).isFalse();
    assertThat(widget.data().morningReviewState()).isEqualTo("NOT_STARTED");
  }

  @Test
  void returnsReviewDataWhenActivityExists() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    given(reviewTodayPort.getTodayReview(userId, today))
        .willReturn(new TodayReviewSummary(true, false, "FINALIZED", "DRAFT"));

    ReviewWidget widget = provider.getWidget(userId, today, zoneId);

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data().morningReviewCompleted()).isTrue();
    assertThat(widget.data().eveningReviewCompleted()).isFalse();
    assertThat(widget.data().morningReviewState()).isEqualTo("FINALIZED");
    assertThat(widget.data().eveningReviewState()).isEqualTo("DRAFT");
  }
}
