package tech.buildwithpartha.lifeos.sprint.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.sprint.domain.Review;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewAnswer;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewItemDecision;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewSnapshotMetrics;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewStatus;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Transactional
class JpaReviewRepositoryTest {

  @Autowired private JpaReviewRepository jpaReviewRepository;

  private final UUID userId = UUID.randomUUID();
  private final Instant now = Instant.parse("2026-08-25T12:00:00Z");

  @Test
  @DisplayName("save and findById persists and reloads review aggregate with answers and decisions")
  void saveAndFindById() {
    UUID reviewId = UUID.randomUUID();
    ReviewAnswer answer1 = new ReviewAnswer(UUID.randomUUID(), "win", "Shipped feature LOS-1009");
    ReviewAnswer answer2 = new ReviewAnswer(UUID.randomUUID(), "friction", "None");

    ReviewItemDecision decision =
        new ReviewItemDecision(
            UUID.randomUUID(),
            "TASK",
            UUID.randomUUID(),
            "KEEP_FOR_TOMORROW",
            Optional.of(LocalDate.of(2026, 8, 26)),
            Optional.of("Carry forward"));

    Review draft =
        Review.createDraft(
            reviewId,
            userId,
            ReviewType.DAILY_EVENING,
            "2026-08-25",
            LocalDate.of(2026, 8, 25),
            LocalDate.of(2026, 8, 25),
            "UTC",
            List.of(answer1, answer2),
            List.of(decision),
            now);

    Review saved = jpaReviewRepository.save(draft);
    assertThat(saved.id()).isEqualTo(reviewId);

    Optional<Review> reloadedOpt = jpaReviewRepository.findById(reviewId);
    assertThat(reloadedOpt).isPresent();
    Review reloaded = reloadedOpt.get();

    assertThat(reloaded.reviewType()).isEqualTo(ReviewType.DAILY_EVENING);
    assertThat(reloaded.periodKey()).isEqualTo("2026-08-25");
    assertThat(reloaded.status()).isEqualTo(ReviewStatus.DRAFT);
    assertThat(reloaded.answers()).hasSize(2);
    assertThat(reloaded.answers())
        .extracting(ReviewAnswer::promptKey)
        .containsExactlyInAnyOrder("win", "friction");
    assertThat(reloaded.itemDecisions()).hasSize(1);
    assertThat(reloaded.itemDecisions().get(0).action()).isEqualTo("KEEP_FOR_TOMORROW");
  }

  @Test
  @DisplayName("findByUserIdAndTypeAndPeriodKey retrieves correct review")
  void findByUserIdAndTypeAndPeriodKey() {
    Review review =
        Review.createDraft(
            UUID.randomUUID(),
            userId,
            ReviewType.WEEKLY,
            "2026-W35",
            LocalDate.of(2026, 8, 24),
            LocalDate.of(2026, 8, 30),
            "America/New_York",
            List.of(),
            List.of(),
            now);

    jpaReviewRepository.save(review);

    Optional<Review> found =
        jpaReviewRepository.findByUserIdAndTypeAndPeriodKey(userId, ReviewType.WEEKLY, "2026-W35");
    assertThat(found).isPresent();
    assertThat(found.get().timeZone()).isEqualTo("America/New_York");
  }

  @Test
  @DisplayName("finalized review with frozen snapshot metrics round-trips correctly")
  void finalizedReviewSnapshotRoundTrips() {
    Review review =
        Review.createDraft(
            UUID.randomUUID(),
            userId,
            ReviewType.MONTHLY,
            "2026-08",
            LocalDate.of(2026, 8, 1),
            LocalDate.of(2026, 8, 31),
            "UTC",
            List.of(),
            List.of(),
            now);

    ReviewSnapshotMetrics metrics =
        new ReviewSnapshotMetrics(
            Optional.of(15),
            Optional.of(20),
            Optional.of(2),
            Optional.of(1),
            Optional.of(0),
            Optional.of(1000),
            Optional.of(950),
            Optional.of(40),
            Optional.of(35),
            Optional.of(5),
            Optional.of(2),
            Optional.of(0),
            Optional.of(25),
            false,
            Optional.empty());

    Review finalized = review.finalizeReview(metrics, null, null, now.plusSeconds(1800));
    jpaReviewRepository.save(finalized);

    Optional<Review> reloadedOpt = jpaReviewRepository.findById(review.id());
    assertThat(reloadedOpt).isPresent();
    Review reloaded = reloadedOpt.get();

    assertThat(reloaded.status()).isEqualTo(ReviewStatus.FINALIZED);
    assertThat(reloaded.finalizedAt()).contains(now.plusSeconds(1800));
    assertThat(reloaded.snapshot()).isPresent();
    ReviewSnapshotMetrics loadedMetrics = reloaded.snapshot().get();
    assertThat(loadedMetrics.tasksCompletedCount()).contains(15);
    assertThat(loadedMetrics.plannedFocusMinutes()).contains(1000);
    assertThat(loadedMetrics.hasMissingData()).isFalse();
  }
}
