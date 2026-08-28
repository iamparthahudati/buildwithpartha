package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlan;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanCapacity;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanConflictSummary;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanItem;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanOutcome;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanRepository;

@Repository
public class JpaWeeklyPlanRepository implements WeeklyPlanRepository {
  private final WeeklyPlanJpaRepository plans;
  private final WeeklyPlanCapacityJpaRepository capacities;
  private final WeeklyPlanOutcomeJpaRepository outcomes;
  private final WeeklyPlanItemJpaRepository items;

  public JpaWeeklyPlanRepository(
      WeeklyPlanJpaRepository plans,
      WeeklyPlanCapacityJpaRepository capacities,
      WeeklyPlanOutcomeJpaRepository outcomes,
      WeeklyPlanItemJpaRepository items) {
    this.plans = plans;
    this.capacities = capacities;
    this.outcomes = outcomes;
    this.items = items;
  }

  @Override
  public void lockUser(UUID userId) {
    if (plans.lockUserById(userId) == null) {
      throw new ResourceNotFoundException("Account not found");
    }
  }

  @Override
  public WeeklyPlan save(WeeklyPlan plan) {
    WeeklyPlanEntity saved = plans.saveAndFlush(toEntity(plan));
    items.deleteByWeeklyPlanId(plan.id());
    outcomes.deleteByWeeklyPlanId(plan.id());
    capacities.deleteByWeeklyPlanId(plan.id());
    capacities.saveAllAndFlush(
        plan.capacities().stream()
            .map(
                item ->
                    new WeeklyPlanCapacityEntity(
                        UUID.randomUUID(), plan.id(), item.localDate(), item.availableMinutes()))
            .toList());
    outcomes.saveAllAndFlush(
        plan.outcomes().stream()
            .map(
                outcome ->
                    new WeeklyPlanOutcomeEntity(
                        outcome.id(), plan.id(), outcome.title(), outcome.position()))
            .toList());
    items.saveAllAndFlush(
        plan.items().stream()
            .map(
                item ->
                    new WeeklyPlanItemEntity(
                        item.id(),
                        plan.id(),
                        plan.userId(),
                        item.taskId(),
                        item.outcomeId().orElse(null),
                        item.plannedDate().orElse(null),
                        item.plannedMinutes(),
                        item.position(),
                        item.taskTitleSnapshot(),
                        item.taskStatusSnapshot()))
            .toList());
    return load(saved);
  }

  @Override
  public Optional<WeeklyPlan> findByIdAndUserId(UUID id, UUID userId) {
    return plans.findByIdAndUserId(id, userId).map(this::load);
  }

  @Override
  public List<WeeklyPlan> findByUserId(UUID userId) {
    return plans.findByUserIdOrderByWeekStartDateDescRevisionDesc(userId).stream()
        .map(this::load)
        .toList();
  }

  @Override
  public List<WeeklyPlan> findByUserIdAndWeekStartDate(UUID userId, LocalDate weekStartDate) {
    return plans.findByUserIdAndWeekStartDateOrderByRevisionAsc(userId, weekStartDate).stream()
        .map(this::load)
        .toList();
  }

  @Override
  public Set<UUID> findExistingOutcomeIds(Set<UUID> outcomeIds) {
    return outcomeIds.isEmpty() ? Set.of() : outcomes.findExistingIds(outcomeIds);
  }

  @Override
  public Set<UUID> findExistingItemIds(Set<UUID> itemIds) {
    return itemIds.isEmpty() ? Set.of() : items.findExistingIds(itemIds);
  }

  private WeeklyPlan load(WeeklyPlanEntity entity) {
    List<WeeklyPlanCapacity> capacity =
        capacities.findByWeeklyPlanIdOrderByLocalDateAsc(entity.getId()).stream()
            .map(item -> new WeeklyPlanCapacity(item.getLocalDate(), item.getAvailableMinutes()))
            .toList();
    List<WeeklyPlanOutcome> outcome =
        outcomes.findByWeeklyPlanIdOrderByPositionAscIdAsc(entity.getId()).stream()
            .map(item -> new WeeklyPlanOutcome(item.getId(), item.getTitle(), item.getPosition()))
            .toList();
    List<WeeklyPlanItem> planItems =
        items.findByWeeklyPlanIdOrderByPositionAscIdAsc(entity.getId()).stream()
            .map(
                item ->
                    new WeeklyPlanItem(
                        item.getId(),
                        item.getTaskId(),
                        Optional.ofNullable(item.getOutcomeId()),
                        Optional.ofNullable(item.getPlannedDate()),
                        item.getPlannedMinutes(),
                        item.getPosition(),
                        item.getTaskTitleSnapshot(),
                        item.getTaskStatusSnapshot()))
            .toList();
    return new WeeklyPlan(
        entity.getId(),
        entity.getUserId(),
        entity.getWeekStartDate(),
        entity.getWeekEndDate(),
        entity.getTimeZone(),
        entity.getWeekStartDay(),
        entity.getRevision(),
        entity.getStatus(),
        Optional.ofNullable(entity.getPredecessorPlanId()),
        Optional.ofNullable(entity.getFinalizedAt()),
        summary(entity),
        capacity,
        outcome,
        planItems,
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        entity.getVersion());
  }

  private static Optional<WeeklyPlanConflictSummary> summary(WeeklyPlanEntity entity) {
    if (entity.getSnapshotTotalPlannedMinutes() == null) {
      return Optional.empty();
    }
    List<LocalDate> dates =
        entity.getSnapshotOvercapacityDates() == null
                || entity.getSnapshotOvercapacityDates().isBlank()
            ? List.of()
            : Arrays.stream(entity.getSnapshotOvercapacityDates().split(","))
                .map(LocalDate::parse)
                .toList();
    return Optional.of(
        new WeeklyPlanConflictSummary(
            entity.getSnapshotTotalPlannedMinutes(),
            entity.getSnapshotTotalCapacityMinutes(),
            entity.getSnapshotOvercapacityMinutes(),
            dates,
            entity.getSnapshotOverlappingTimeBlockCount(),
            entity.getSnapshotUnscheduledItemCount(),
            entity.getSnapshotOutcomesWithoutItemsCount()));
  }

  private static WeeklyPlanEntity toEntity(WeeklyPlan plan) {
    WeeklyPlanConflictSummary summary = plan.finalizedConflictSummary().orElse(null);
    return new WeeklyPlanEntity(
        plan.id(),
        plan.userId(),
        plan.weekStartDate(),
        plan.weekEndDate(),
        plan.timeZone(),
        plan.weekStartDay(),
        plan.revision(),
        plan.status(),
        plan.predecessorPlanId().orElse(null),
        plan.finalizedAt().orElse(null),
        summary == null ? null : summary.totalPlannedMinutes(),
        summary == null ? null : summary.totalCapacityMinutes(),
        summary == null ? null : summary.overcapacityMinutes(),
        summary == null
            ? null
            : summary.overcapacityDates().stream()
                .map(LocalDate::toString)
                .reduce((left, right) -> left + "," + right)
                .orElse(""),
        summary == null ? null : summary.overlappingTimeBlockCount(),
        summary == null ? null : summary.unscheduledItemCount(),
        summary == null ? null : summary.outcomesWithoutItemsCount(),
        plan.createdAt(),
        plan.updatedAt(),
        plan.version());
  }
}
