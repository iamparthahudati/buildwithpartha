package tech.buildwithpartha.lifeos.sprint.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public record WeeklyPlan(
    UUID id,
    UUID userId,
    LocalDate weekStartDate,
    LocalDate weekEndDate,
    String timeZone,
    int weekStartDay,
    int revision,
    WeeklyPlanStatus status,
    Optional<UUID> predecessorPlanId,
    Optional<Instant> finalizedAt,
    Optional<WeeklyPlanConflictSummary> finalizedConflictSummary,
    List<WeeklyPlanCapacity> capacities,
    List<WeeklyPlanOutcome> outcomes,
    List<WeeklyPlanItem> items,
    Instant createdAt,
    Instant updatedAt,
    long version) {
  public WeeklyPlan {
    Objects.requireNonNull(id);
    Objects.requireNonNull(userId);
    Objects.requireNonNull(weekStartDate);
    Objects.requireNonNull(weekEndDate);
    Objects.requireNonNull(timeZone);
    Objects.requireNonNull(status);
    Objects.requireNonNull(predecessorPlanId);
    Objects.requireNonNull(finalizedAt);
    Objects.requireNonNull(finalizedConflictSummary);
    Objects.requireNonNull(capacities);
    Objects.requireNonNull(outcomes);
    Objects.requireNonNull(items);
    Objects.requireNonNull(createdAt);
    Objects.requireNonNull(updatedAt);
    if (!weekEndDate.equals(weekStartDate.plusDays(6))) {
      throw new IllegalArgumentException("A Weekly Plan must contain exactly seven local dates");
    }
    if (weekStartDay < 1 || weekStartDay > 7 || revision < 1) {
      throw new IllegalArgumentException("Invalid Weekly Plan identity");
    }
    capacities = List.copyOf(capacities);
    outcomes = List.copyOf(outcomes);
    items = List.copyOf(items);
  }
}
