package tech.buildwithpartha.lifeos.timeblock.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTimeSummary;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockDomainFixture;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

class TimeBlockTimeSummaryAdapterTests {

  @Test
  void clipsOvernightBlocksGroupsCategoriesAndExcludesCancelledTime() {
    UUID userId = UUID.randomUUID();
    Instant dayStart = Instant.parse("2026-08-25T00:00:00Z");
    Instant dayEnd = Instant.parse("2026-08-26T00:00:00Z");
    TimeBlock focusAcrossMidnight =
        block(
            userId,
            "Focus",
            "2026-08-24T23:30:00Z",
            "2026-08-25T01:30:00Z",
            TimeBlockStatus.SCHEDULED);
    TimeBlock secondFocus =
        block(
            userId,
            "FOCUS",
            "2026-08-25T10:00:00Z",
            "2026-08-25T10:45:00Z",
            TimeBlockStatus.COMPLETED);
    TimeBlock personal =
        block(
            userId,
            "Personal",
            "2026-08-25T12:00:00Z",
            "2026-08-25T12:30:00Z",
            TimeBlockStatus.SCHEDULED);
    TimeBlock cancelled =
        block(
            userId,
            "Focus",
            "2026-08-25T13:00:00Z",
            "2026-08-25T15:00:00Z",
            TimeBlockStatus.CANCELLED);
    TimeBlockRepository repository = mock(TimeBlockRepository.class);
    given(repository.findByUserIdAndRange(userId, dayStart, dayEnd))
        .willReturn(List.of(focusAcrossMidnight, secondFocus, personal, cancelled));

    TimeBlockTimeSummary result =
        new TimeBlockTimeSummaryAdapter(repository).summarize(userId, dayStart, dayEnd);

    assertThat(result.plannedFocusMinutes()).isEqualTo(135);
    assertThat(result.personalMinutes()).isEqualTo(30);
    assertThat(result.categories())
        .extracting("category", "minutes")
        .containsExactly(
            org.assertj.core.groups.Tuple.tuple("Focus", 135),
            org.assertj.core.groups.Tuple.tuple("Personal", 30));
  }

  private static TimeBlock block(
      UUID userId, String category, String start, String end, TimeBlockStatus status) {
    return TimeBlockDomainFixture.aTimeBlock()
        .withUserId(userId)
        .withCategory(category)
        .withStatus(status)
        .withStartAt(Instant.parse(start))
        .withEndAt(Instant.parse(end))
        .withSourceTimeZone("UTC")
        .build();
  }
}
