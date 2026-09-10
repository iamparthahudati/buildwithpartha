package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
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
    WeeklyPlanEntity entity = toEntity(plan);
    WeeklyPlanEntity saved = plans.saveAndFlush(entity);
    capacities.deleteByWeeklyPlanId(plan.id());
    capacities.saveAllAndFlush(
        plan.capacities().stream()
            .map(
                item ->
                    new WeeklyPlanCapacityEntity(
                        UUID.randomUUID(), plan.id(), item.localDate(), item.availableMinutes()))
            .toList());
    outcomes.deleteByWeeklyPlanId(plan.id());
    outcomes.saveAllAndFlush(
        plan.outcomes().stream()
            .map(
                item ->
                    new WeeklyPlanOutcomeEntity(
                        item.id(), plan.id(), item.title(), item.position()))
            .toList());
    items.deleteByWeeklyPlanId(plan.id());
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
    return loadBatch(plans.findByUserIdOrderByWeekStartDateDescRevisionDesc(userId));
  }

  @Override
  public List<WeeklyPlan> findByUserIdAndWeekStartDate(UUID userId, LocalDate weekStartDate) {
    return loadBatch(plans.findByUserIdAndWeekStartDateOrderByRevisionAsc(userId, weekStartDate));
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
    return loadWithAssociations(entity, capacity, outcome, planItems);
  }

  private List<WeeklyPlan> loadBatch(List<WeeklyPlanEntity> planEntities) {
    if (planEntities.isEmpty()) {
      return List.of();
    }
    List<UUID> planIds = planEntities.stream().map(WeeklyPlanEntity::getId).toList();

    Map<UUID, List<WeeklyPlanCapacity>> capacityMap =
        capacities.findByWeeklyPlanIdInOrderByLocalDateAsc(planIds).stream()
            .collect(
                Collectors.groupingBy(
                    WeeklyPlanCapacityEntity::getWeeklyPlanId,
                    Collectors.mapping(
                        item ->
                            new WeeklyPlanCapacity(item.getLocalDate(), item.getAvailableMinutes()),
                        Collectors.toList())));

    Map<UUID, List<WeeklyPlanOutcome>> outcomeMap =
        outcomes.findByWeeklyPlanIdInOrderByPositionAscIdAsc(planIds).stream()
            .collect(
                Collectors.groupingBy(
                    WeeklyPlanOutcomeEntity::getWeeklyPlanId,
                    Collectors.mapping(
                        item ->
                            new WeeklyPlanOutcome(
                                item.getId(), item.getTitle(), item.getPosition()),
                        Collectors.toList())));

    Map<UUID, List<WeeklyPlanItem>> itemMap =
        items.findByWeeklyPlanIdInOrderByPositionAscIdAsc(planIds).stream()
            .collect(
                Collectors.groupingBy(
                    WeeklyPlanItemEntity::getWeeklyPlanId,
                    Collectors.mapping(
                        item ->
                            new WeeklyPlanItem(
                                item.getId(),
                                item.getTaskId(),
                                Optional.ofNullable(item.getOutcomeId()),
                                Optional.ofNullable(item.getPlannedDate()),
                                item.getPlannedMinutes(),
                                item.getPosition(),
                                item.getTaskTitleSnapshot(),
                                item.getTaskStatusSnapshot()),
                        Collectors.toList())));

    return planEntities.stream()
        .map(
            entity ->
                loadWithAssociations(
                    entity,
                    capacityMap.getOrDefault(entity.getId(), List.of()),
                    outcomeMap.getOrDefault(entity.getId(), List.of()),
                    itemMap.getOrDefault(entity.getId(), List.of())))
        .toList();
  }

  private WeeklyPlan loadWithAssociations(
      WeeklyPlanEntity entity,
      List<WeeklyPlanCapacity> capacity,
      List<WeeklyPlanOutcome> outcome,
      List<WeeklyPlanItem> planItems) {
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
