package tech.buildwithpartha.lifeos.sprint.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public record Review(
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
    Optional<ReviewSnapshotMetrics> snapshot,
    List<ReviewAnswer> answers,
    List<ReviewItemDecision> itemDecisions,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public Review {
    Objects.requireNonNull(id);
    Objects.requireNonNull(userId);
    Objects.requireNonNull(reviewType);
    Objects.requireNonNull(periodKey);
    Objects.requireNonNull(startDate);
    Objects.requireNonNull(endDate);
    Objects.requireNonNull(timeZone);
    Objects.requireNonNull(status);
    Objects.requireNonNull(skipReason);
    Objects.requireNonNull(finalizedAt);
    Objects.requireNonNull(snapshot);
    Objects.requireNonNull(answers);
    Objects.requireNonNull(itemDecisions);
    Objects.requireNonNull(createdAt);
    Objects.requireNonNull(updatedAt);

    if (periodKey.isBlank()) {
      throw new IllegalArgumentException("Period key cannot be blank");
    }
    if (endDate.isBefore(startDate)) {
      throw new IllegalArgumentException("End date cannot precede start date");
    }
    if (status == ReviewStatus.SKIPPED && skipReason.map(String::isBlank).orElse(true)) {
      throw new IllegalArgumentException("Skipped review must provide a skip reason");
    }
    if (status == ReviewStatus.FINALIZED && finalizedAt.isEmpty()) {
      throw new IllegalArgumentException("Finalized review must record finalizedAt timestamp");
    }
    if (status == ReviewStatus.FINALIZED && snapshot.isEmpty()) {
      throw new IllegalArgumentException("Finalized review must include frozen metric snapshot");
    }

    answers = List.copyOf(answers);
    itemDecisions = List.copyOf(itemDecisions);
  }

  public static Review createDraft(
      UUID id,
      UUID userId,
      ReviewType reviewType,
      String periodKey,
      LocalDate startDate,
      LocalDate endDate,
      String timeZone,
      List<ReviewAnswer> answers,
      List<ReviewItemDecision> itemDecisions,
      Instant now) {
    return new Review(
        id,
        userId,
        reviewType,
        periodKey,
        startDate,
        endDate,
        timeZone,
        ReviewStatus.DRAFT,
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        answers,
        itemDecisions,
        now,
        now,
        0L);
  }

  public Review updateDraft(
      List<ReviewAnswer> newAnswers,
      List<ReviewItemDecision> newItemDecisions,
      Optional<ReviewSnapshotMetrics> newSnapshot,
      Instant now) {
    if (status == ReviewStatus.FINALIZED || status == ReviewStatus.SKIPPED) {
      throw new IllegalStateException("Cannot edit a review that is already " + status);
    }
    return new Review(
        id,
        userId,
        reviewType,
        periodKey,
        startDate,
        endDate,
        timeZone,
        ReviewStatus.DRAFT,
        Optional.empty(),
        Optional.empty(),
        newSnapshot,
        newAnswers,
        newItemDecisions,
        createdAt,
        now,
        version);
  }

  public Review finalizeReview(
      ReviewSnapshotMetrics finalSnapshot,
      List<ReviewAnswer> finalAnswers,
      List<ReviewItemDecision> finalDecisions,
      Instant now) {
    if (status == ReviewStatus.FINALIZED) {
      // Idempotent: return existing finalized review without modifying snapshot
      return this;
    }
    if (status == ReviewStatus.SKIPPED) {
      throw new IllegalStateException("Cannot finalize a review that was skipped");
    }
    Objects.requireNonNull(
        finalSnapshot, "Final snapshot must be supplied for review finalization");
    return new Review(
        id,
        userId,
        reviewType,
        periodKey,
        startDate,
        endDate,
        timeZone,
        ReviewStatus.FINALIZED,
        Optional.empty(),
        Optional.of(now),
        Optional.of(finalSnapshot),
        finalAnswers != null ? finalAnswers : answers,
        finalDecisions != null ? finalDecisions : itemDecisions,
        createdAt,
        now,
        version);
  }

  public Review skipReview(String reason, Instant now) {
    if (status == ReviewStatus.FINALIZED) {
      throw new IllegalStateException("Cannot skip a review that is already finalized");
    }
    if (reason == null || reason.isBlank()) {
      throw new IllegalArgumentException("Skip reason must be provided");
    }
    return new Review(
        id,
        userId,
        reviewType,
        periodKey,
        startDate,
        endDate,
        timeZone,
        ReviewStatus.SKIPPED,
        Optional.of(reason),
        Optional.empty(),
        Optional.empty(),
        answers,
        itemDecisions,
        createdAt,
        now,
        version);
  }
}
