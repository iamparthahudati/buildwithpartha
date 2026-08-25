package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.sprint.domain.Review;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewAnswer;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewItemDecision;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewRepository;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewSnapshotMetrics;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

@Repository
@Transactional
public class JpaReviewRepository implements ReviewRepository {
  private final ReviewJpaRepository reviewJpaRepository;
  private final ReviewAnswerJpaRepository reviewAnswerJpaRepository;
  private final ReviewItemDecisionJpaRepository reviewItemDecisionJpaRepository;

  public JpaReviewRepository(
      ReviewJpaRepository reviewJpaRepository,
      ReviewAnswerJpaRepository reviewAnswerJpaRepository,
      ReviewItemDecisionJpaRepository reviewItemDecisionJpaRepository) {
    this.reviewJpaRepository = reviewJpaRepository;
    this.reviewAnswerJpaRepository = reviewAnswerJpaRepository;
    this.reviewItemDecisionJpaRepository = reviewItemDecisionJpaRepository;
  }

  @Override
  public Review save(Review review) {
    ReviewEntity entity = toEntity(review);
    ReviewEntity savedEntity = reviewJpaRepository.save(entity);

    reviewAnswerJpaRepository.deleteByReviewId(review.id());
    List<ReviewAnswerEntity> answerEntities =
        review.answers().stream()
            .map(a -> new ReviewAnswerEntity(a.id(), review.id(), a.promptKey(), a.answerValue()))
            .toList();
    if (!answerEntities.isEmpty()) {
      reviewAnswerJpaRepository.saveAll(answerEntities);
    }

    reviewItemDecisionJpaRepository.deleteByReviewId(review.id());
    List<ReviewItemDecisionEntity> decisionEntities =
        review.itemDecisions().stream()
            .map(
                d ->
                    new ReviewItemDecisionEntity(
                        d.id(),
                        review.id(),
                        d.itemType(),
                        d.itemId(),
                        d.action(),
                        d.targetDate().orElse(null),
                        d.notes().orElse(null)))
            .toList();
    if (!decisionEntities.isEmpty()) {
      reviewItemDecisionJpaRepository.saveAll(decisionEntities);
    }

    return toDomain(savedEntity, answerEntities, decisionEntities);
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<Review> findById(UUID id) {
    return reviewJpaRepository.findById(id).map(this::loadDomain);
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<Review> findByUserIdAndTypeAndPeriodKey(
      UUID userId, ReviewType reviewType, String periodKey) {
    return reviewJpaRepository
        .findByUserIdAndReviewTypeAndPeriodKey(userId, reviewType, periodKey)
        .map(this::loadDomain);
  }

  @Override
  @Transactional(readOnly = true)
  public List<Review> findByUserIdAndType(UUID userId, ReviewType reviewType) {
    return reviewJpaRepository
        .findByUserIdAndReviewTypeOrderByStartDateDesc(userId, reviewType)
        .stream()
        .map(this::loadDomain)
        .toList();
  }

  @Override
  @Transactional(readOnly = true)
  public List<Review> findByUserId(UUID userId) {
    return reviewJpaRepository.findByUserIdOrderByStartDateDesc(userId).stream()
        .map(this::loadDomain)
        .toList();
  }

  private Review loadDomain(ReviewEntity entity) {
    List<ReviewAnswerEntity> answerEntities =
        reviewAnswerJpaRepository.findByReviewId(entity.getId());
    List<ReviewItemDecisionEntity> decisionEntities =
        reviewItemDecisionJpaRepository.findByReviewId(entity.getId());
    return toDomain(entity, answerEntities, decisionEntities);
  }

  private ReviewEntity toEntity(Review review) {
    ReviewSnapshotMetrics metrics = review.snapshot().orElse(null);
    return new ReviewEntity(
        review.id(),
        review.userId(),
        review.reviewType(),
        review.periodKey(),
        review.startDate(),
        review.endDate(),
        review.timeZone(),
        review.status(),
        review.skipReason().orElse(null),
        review.finalizedAt().orElse(null),
        metrics != null ? metrics.tasksCompletedCount().orElse(null) : null,
        metrics != null ? metrics.tasksPlannedCount().orElse(null) : null,
        metrics != null ? metrics.tasksCarriedOverCount().orElse(null) : null,
        metrics != null ? metrics.tasksCancelledCount().orElse(null) : null,
        metrics != null ? metrics.tasksOverdueCount().orElse(null) : null,
        metrics != null ? metrics.plannedFocusMinutes().orElse(null) : null,
        metrics != null ? metrics.actualFocusMinutes().orElse(null) : null,
        metrics != null ? metrics.sprintCommittedCount().orElse(null) : null,
        metrics != null ? metrics.sprintCompletedCount().orElse(null) : null,
        metrics != null ? metrics.activeProjectCount().orElse(null) : null,
        metrics != null ? metrics.completedProjectCount().orElse(null) : null,
        metrics != null ? metrics.stalledProjectCount().orElse(null) : null,
        metrics != null ? metrics.dailyReviewCompletionCount().orElse(null) : null,
        metrics != null ? metrics.hasMissingData() : null,
        metrics != null ? metrics.missingDataNotes().orElse(null) : null,
        review.createdAt(),
        review.updatedAt(),
        review.version());
  }

  private Review toDomain(
      ReviewEntity entity,
      List<ReviewAnswerEntity> answerEntities,
      List<ReviewItemDecisionEntity> decisionEntities) {
    List<ReviewAnswer> answers =
        answerEntities.stream()
            .map(a -> new ReviewAnswer(a.getId(), a.getPromptKey(), a.getAnswerValue()))
            .toList();

    List<ReviewItemDecision> decisions =
        decisionEntities.stream()
            .map(
                d ->
                    new ReviewItemDecision(
                        d.getId(),
                        d.getItemType(),
                        d.getItemId(),
                        d.getAction(),
                        Optional.ofNullable(d.getTargetDate()),
                        Optional.ofNullable(d.getNotes())))
            .toList();

    Optional<ReviewSnapshotMetrics> snapshot =
        entity.getSnapshotHasMissingData() != null
            ? Optional.of(
                new ReviewSnapshotMetrics(
                    Optional.ofNullable(entity.getSnapshotTasksCompletedCount()),
                    Optional.ofNullable(entity.getSnapshotTasksPlannedCount()),
                    Optional.ofNullable(entity.getSnapshotTasksCarriedOverCount()),
                    Optional.ofNullable(entity.getSnapshotTasksCancelledCount()),
                    Optional.ofNullable(entity.getSnapshotTasksOverdueCount()),
                    Optional.ofNullable(entity.getSnapshotPlannedFocusMinutes()),
                    Optional.ofNullable(entity.getSnapshotActualFocusMinutes()),
                    Optional.ofNullable(entity.getSnapshotSprintCommittedCount()),
                    Optional.ofNullable(entity.getSnapshotSprintCompletedCount()),
                    Optional.ofNullable(entity.getSnapshotActiveProjectCount()),
                    Optional.ofNullable(entity.getSnapshotCompletedProjectCount()),
                    Optional.ofNullable(entity.getSnapshotStalledProjectCount()),
                    Optional.ofNullable(entity.getSnapshotDailyReviewCompletionCount()),
                    entity.getSnapshotHasMissingData(),
                    Optional.ofNullable(entity.getSnapshotMissingDataNotes())))
            : Optional.empty();

    return new Review(
        entity.getId(),
        entity.getUserId(),
        entity.getReviewType(),
        entity.getPeriodKey(),
        entity.getStartDate(),
        entity.getEndDate(),
        entity.getTimeZone(),
        entity.getStatus(),
        Optional.ofNullable(entity.getSkipReason()),
        Optional.ofNullable(entity.getFinalizedAt()),
        snapshot,
        answers,
        decisions,
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        entity.getVersion());
  }
}
