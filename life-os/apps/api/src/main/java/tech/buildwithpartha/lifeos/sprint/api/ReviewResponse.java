package tech.buildwithpartha.lifeos.sprint.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.domain.Review;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewStatus;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

public record ReviewResponse(
    UUID id,
    UUID userId,
    ReviewType reviewType,
    String periodKey,
    LocalDate startDate,
    LocalDate endDate,
    String timeZone,
    ReviewStatus status,
    Optional<String> skipReason,
    Optional<Instant> finalizedAt,
    Optional<ReviewSnapshotMetricsResponse> snapshot,
    List<ReviewAnswerResponse> answers,
    List<ReviewItemDecisionResponse> itemDecisions,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static ReviewResponse fromDomain(Review review) {
    return new ReviewResponse(
        review.id(),
        review.userId(),
        review.reviewType(),
        review.periodKey(),
        review.startDate(),
        review.endDate(),
        review.timeZone(),
        review.status(),
        review.skipReason(),
        review.finalizedAt(),
        review.snapshot().map(ReviewSnapshotMetricsResponse::fromDomain),
        review.answers().stream().map(ReviewAnswerResponse::fromDomain).toList(),
        review.itemDecisions().stream().map(ReviewItemDecisionResponse::fromDomain).toList(),
        review.createdAt(),
        review.updatedAt(),
        review.version());
  }
}
