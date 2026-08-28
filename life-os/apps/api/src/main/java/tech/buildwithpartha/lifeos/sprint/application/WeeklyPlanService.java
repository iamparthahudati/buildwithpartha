package tech.buildwithpartha.lifeos.sprint.application;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.error.WeeklyPlanStateConflictException;
import tech.buildwithpartha.lifeos.common.task.WeeklyPlanTaskPort;
import tech.buildwithpartha.lifeos.common.task.WeeklyPlanTaskSummary;
import tech.buildwithpartha.lifeos.common.time.WeeklyPlanSchedulePort;
import tech.buildwithpartha.lifeos.common.time.WeeklyPlanTimeBlock;
import tech.buildwithpartha.lifeos.common.user.UserPlanningContext;
import tech.buildwithpartha.lifeos.common.user.UserPlanningContextProvider;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlan;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanCapacity;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanConflictSummary;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanItem;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanOutcome;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanRepository;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanStatus;

@Service
@Transactional
public class WeeklyPlanService {
  private final WeeklyPlanRepository repository;
  private final WeeklyPlanTaskPort tasks;
  private final WeeklyPlanSchedulePort schedule;
  private final UserPlanningContextProvider planningContext;
  private final Clock clock;

  public WeeklyPlanService(
      WeeklyPlanRepository repository,
      WeeklyPlanTaskPort tasks,
      WeeklyPlanSchedulePort schedule,
      UserPlanningContextProvider planningContext,
      Clock clock) {
    this.repository = repository;
    this.tasks = tasks;
    this.schedule = schedule;
    this.planningContext = planningContext;
    this.clock = clock;
  }

  public WeeklyPlanView create(UUID userId, CreateWeeklyPlanCommand command) {
    repository.lockUser(userId);
    UserPlanningContext context = planningContext.getPlanningContext(userId);
    LocalDate weekStart =
        command.weekDate().with(TemporalAdjusters.previousOrSame(context.weekStart()));
    if (!repository.findByUserIdAndWeekStartDate(userId, weekStart).isEmpty()) {
      throw new WeeklyPlanStateConflictException("A Weekly Plan already exists for this week");
    }
    Instant now = clock.instant();
    WeeklyPlan plan =
        build(
            UUID.randomUUID(),
            userId,
            weekStart,
            context.timeZone(),
            context.weekStart().getValue(),
            1,
            Optional.empty(),
            command.capacities(),
            command.outcomes(),
            command.items(),
            List.of(),
            List.of(),
            now,
            now,
            0L);
    WeeklyPlan saved = repository.save(plan);
    return view(saved);
  }

  @Transactional(readOnly = true)
  public WeeklyPlanView get(UUID userId, UUID planId) {
    return view(owned(userId, planId));
  }

  @Transactional(readOnly = true)
  public List<WeeklyPlanView> list(UUID userId, LocalDate weekDate) {
    List<WeeklyPlan> plans;
    if (weekDate == null) {
      plans = repository.findByUserId(userId);
    } else {
      UserPlanningContext context = planningContext.getPlanningContext(userId);
      LocalDate weekStart = weekDate.with(TemporalAdjusters.previousOrSame(context.weekStart()));
      plans = repository.findByUserIdAndWeekStartDate(userId, weekStart);
    }
    return plans.stream().map(this::view).toList();
  }

  public WeeklyPlanView update(UUID userId, UUID planId, UpdateWeeklyPlanCommand command) {
    repository.lockUser(userId);
    WeeklyPlan current = owned(userId, planId);
    requireDraft(current);
    checkVersion(current, command.version());
    WeeklyPlan replacement =
        build(
            current.id(),
            current.userId(),
            current.weekStartDate(),
            ZoneId.of(current.timeZone()),
            current.weekStartDay(),
            current.revision(),
            current.predecessorPlanId(),
            command.capacities(),
            command.outcomes(),
            command.items(),
            current.outcomes(),
            current.items(),
            current.createdAt(),
            clock.instant(),
            current.version());
    return view(repository.save(replacement));
  }

  public WeeklyPlanView finalizePlan(UUID userId, UUID planId, long version) {
    repository.lockUser(userId);
    WeeklyPlan current = owned(userId, planId);
    if (current.status() == WeeklyPlanStatus.FINALIZED) {
      return view(current);
    }
    checkVersion(current, version);
    Instant now = clock.instant();
    List<WeeklyPlanItem> snapshotItems =
        current.items().stream()
            .map(
                item -> {
                  WeeklyPlanTaskSummary task = tasks.getTask(userId, item.taskId());
                  return copyWithSnapshot(item, task);
                })
            .toList();
    WeeklyPlanConflictSummary summary = liveConflicts(current, snapshotItems);
    WeeklyPlan finalized =
        new WeeklyPlan(
            current.id(),
            current.userId(),
            current.weekStartDate(),
            current.weekEndDate(),
            current.timeZone(),
            current.weekStartDay(),
            current.revision(),
            WeeklyPlanStatus.FINALIZED,
            current.predecessorPlanId(),
            Optional.of(now),
            Optional.of(summary),
            current.capacities(),
            current.outcomes(),
            snapshotItems,
            current.createdAt(),
            now,
            current.version());
    return view(repository.save(finalized));
  }

  public WeeklyPlanView reopen(UUID userId, UUID planId, long version) {
    repository.lockUser(userId);
    WeeklyPlan source = owned(userId, planId);
    if (source.status() != WeeklyPlanStatus.FINALIZED) {
      throw new WeeklyPlanStateConflictException("Only a finalized Weekly Plan can be reopened");
    }
    checkVersion(source, version);
    List<WeeklyPlan> week = repository.findByUserIdAndWeekStartDate(userId, source.weekStartDate());
    if (week.stream().anyMatch(plan -> plan.status() == WeeklyPlanStatus.DRAFT)) {
      throw new WeeklyPlanStateConflictException("This week already has an editable revision");
    }
    int revision = week.stream().mapToInt(WeeklyPlan::revision).max().orElse(0) + 1;
    Instant now = clock.instant();
    ReopenedContent content = copyReopenedContent(source);
    WeeklyPlan successor =
        new WeeklyPlan(
            UUID.randomUUID(),
            userId,
            source.weekStartDate(),
            source.weekEndDate(),
            source.timeZone(),
            source.weekStartDay(),
            revision,
            WeeklyPlanStatus.DRAFT,
            Optional.of(source.id()),
            Optional.empty(),
            Optional.empty(),
            source.capacities(),
            content.outcomes(),
            content.items(),
            now,
            now,
            0L);
    return view(repository.save(successor));
  }

  private ReopenedContent copyReopenedContent(WeeklyPlan source) {
    Map<UUID, UUID> outcomeIds = new HashMap<>();
    for (int index = 0; index < source.outcomes().size(); index++) {
      outcomeIds.put(source.outcomes().get(index).id(), UUID.randomUUID());
    }
    List<WeeklyPlanOutcome> copiedOutcomes = new ArrayList<>();
    for (WeeklyPlanOutcome outcome : source.outcomes()) {
      copiedOutcomes.add(
          new WeeklyPlanOutcome(outcomeIds.get(outcome.id()), outcome.title(), outcome.position()));
    }
    List<WeeklyPlanItem> copiedItems =
        source.items().stream()
            .map(
                item ->
                    new WeeklyPlanItem(
                        UUID.randomUUID(),
                        item.taskId(),
                        item.outcomeId().map(outcomeIds::get),
                        item.plannedDate(),
                        item.plannedMinutes(),
                        item.position(),
                        item.taskTitleSnapshot(),
                        item.taskStatusSnapshot()))
            .toList();
    return new ReopenedContent(copiedOutcomes, copiedItems);
  }

  private WeeklyPlan build(
      UUID id,
      UUID userId,
      LocalDate weekStart,
      ZoneId timeZone,
      int weekStartDay,
      int revision,
      Optional<UUID> predecessor,
      List<WeeklyPlanCapacityInput> capacityInputs,
      List<WeeklyPlanOutcomeInput> outcomeInputs,
      List<WeeklyPlanItemInput> itemInputs,
      List<WeeklyPlanOutcome> existingOutcomes,
      List<WeeklyPlanItem> existingItems,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    LocalDate weekEnd = weekStart.plusDays(6);
    List<WeeklyPlanCapacity> capacities = capacities(weekStart, weekEnd, capacityInputs);
    List<WeeklyPlanOutcome> outcomes = outcomes(outcomeInputs, existingOutcomes);
    Set<UUID> outcomeIds = new HashSet<>();
    outcomes.forEach(outcome -> outcomeIds.add(outcome.id()));
    Map<UUID, WeeklyPlanItem> existingById = new HashMap<>();
    existingItems.forEach(item -> existingById.put(item.id(), item));
    Set<UUID> taskIds = new HashSet<>();
    Set<UUID> itemIds = new HashSet<>();
    List<WeeklyPlanItem> items = new ArrayList<>();
    for (WeeklyPlanItemInput input : itemInputs) {
      UUID itemId = input.id().orElseGet(UUID::randomUUID);
      if (!itemIds.add(itemId)) {
        throw validation("items", "DUPLICATE_ID");
      }
      if (!taskIds.add(input.taskId())) {
        throw validation("items", "DUPLICATE_TASK");
      }
      if (input.outcomeId().isPresent() && !outcomeIds.contains(input.outcomeId().get())) {
        throw validation("items.outcomeId", "OUTCOME_NOT_IN_PLAN");
      }
      if (input.plannedDate().isPresent()
          && (input.plannedDate().get().isBefore(weekStart)
              || input.plannedDate().get().isAfter(weekEnd))) {
        throw validation("items.plannedDate", "OUTSIDE_WEEK");
      }
      if (input.plannedMinutes() < 0 || input.plannedMinutes() > 1440) {
        throw validation("items.plannedMinutes", "RANGE");
      }
      WeeklyPlanTaskSummary task =
          existingById.containsKey(itemId)
              ? tasks.getTask(userId, input.taskId())
              : tasks.getAvailableTask(userId, input.taskId());
      items.add(
          new WeeklyPlanItem(
              itemId,
              input.taskId(),
              input.outcomeId(),
              input.plannedDate(),
              input.plannedMinutes(),
              input.position(),
              task.title(),
              task.status()));
    }
    Set<UUID> newItemIds = new HashSet<>(itemIds);
    newItemIds.removeAll(existingById.keySet());
    if (!repository.findExistingItemIds(newItemIds).isEmpty()) {
      throw validation("items", "ID_ALREADY_IN_USE");
    }
    items.sort(Comparator.comparingInt(WeeklyPlanItem::position).thenComparing(WeeklyPlanItem::id));
    return new WeeklyPlan(
        id,
        userId,
        weekStart,
        weekEnd,
        timeZone.getId(),
        weekStartDay,
        revision,
        WeeklyPlanStatus.DRAFT,
        predecessor,
        Optional.empty(),
        Optional.empty(),
        capacities,
        outcomes,
        items,
        createdAt,
        updatedAt,
        version);
  }

  private static List<WeeklyPlanCapacity> capacities(
      LocalDate start, LocalDate end, List<WeeklyPlanCapacityInput> inputs) {
    Map<LocalDate, Integer> values = new HashMap<>();
    for (int offset = 0; offset < 7; offset++) {
      values.put(start.plusDays(offset), 0);
    }
    Set<LocalDate> supplied = new HashSet<>();
    for (WeeklyPlanCapacityInput input : inputs) {
      if (input.localDate().isBefore(start) || input.localDate().isAfter(end)) {
        throw validation("capacities.localDate", "OUTSIDE_WEEK");
      }
      if (!supplied.add(input.localDate())) {
        throw validation("capacities.localDate", "DUPLICATE");
      }
      if (input.availableMinutes() < 0 || input.availableMinutes() > 1440) {
        throw validation("capacities.availableMinutes", "RANGE");
      }
      values.put(input.localDate(), input.availableMinutes());
    }
    return values.entrySet().stream()
        .sorted(Map.Entry.comparingByKey())
        .map(entry -> new WeeklyPlanCapacity(entry.getKey(), entry.getValue()))
        .toList();
  }

  private List<WeeklyPlanOutcome> outcomes(
      List<WeeklyPlanOutcomeInput> inputs, List<WeeklyPlanOutcome> existingOutcomes) {
    Set<UUID> ids = new HashSet<>();
    Set<UUID> existingIds = new HashSet<>();
    existingOutcomes.forEach(outcome -> existingIds.add(outcome.id()));
    List<WeeklyPlanOutcome> outcomes = new ArrayList<>();
    for (WeeklyPlanOutcomeInput input : inputs) {
      UUID id = input.id().orElseGet(UUID::randomUUID);
      if (!ids.add(id)) {
        throw validation("outcomes", "DUPLICATE_ID");
      }
      String title = input.title() == null ? "" : input.title().trim();
      if (title.isBlank() || title.length() > 200) {
        throw validation("outcomes.title", title.isBlank() ? "NOT_BLANK" : "SIZE");
      }
      outcomes.add(new WeeklyPlanOutcome(id, title, input.position()));
    }
    Set<UUID> newIds = new HashSet<>(ids);
    newIds.removeAll(existingIds);
    if (!repository.findExistingOutcomeIds(newIds).isEmpty()) {
      throw validation("outcomes", "ID_ALREADY_IN_USE");
    }
    outcomes.sort(
        Comparator.comparingInt(WeeklyPlanOutcome::position).thenComparing(WeeklyPlanOutcome::id));
    return outcomes;
  }

  private WeeklyPlanView view(WeeklyPlan plan) {
    WeeklyPlanConflictSummary summary =
        plan.finalizedConflictSummary().orElseGet(() -> liveConflicts(plan, plan.items()));
    return new WeeklyPlanView(plan, summary);
  }

  private WeeklyPlanConflictSummary liveConflicts(WeeklyPlan plan, List<WeeklyPlanItem> planItems) {
    Map<LocalDate, Integer> capacityByDate = new HashMap<>();
    plan.capacities()
        .forEach(item -> capacityByDate.put(item.localDate(), item.availableMinutes()));
    Map<LocalDate, Integer> plannedByDate = new HashMap<>();
    int unscheduled = 0;
    for (WeeklyPlanItem item : planItems) {
      if (item.plannedDate().isEmpty()) {
        unscheduled++;
      } else {
        plannedByDate.merge(item.plannedDate().get(), item.plannedMinutes(), Integer::sum);
      }
    }
    List<LocalDate> overcapacityDates = new ArrayList<>();
    int overcapacityMinutes = 0;
    for (LocalDate date = plan.weekStartDate();
        !date.isAfter(plan.weekEndDate());
        date = date.plusDays(1)) {
      int over = plannedByDate.getOrDefault(date, 0) - capacityByDate.getOrDefault(date, 0);
      if (over > 0) {
        overcapacityDates.add(date);
        overcapacityMinutes += over;
      }
    }
    Set<UUID> usedOutcomes = new HashSet<>();
    planItems.forEach(item -> item.outcomeId().ifPresent(usedOutcomes::add));
    int outcomesWithoutItems =
        (int)
            plan.outcomes().stream()
                .filter(outcome -> !usedOutcomes.contains(outcome.id()))
                .count();
    ZoneId zone = ZoneId.of(plan.timeZone());
    Instant start = plan.weekStartDate().atStartOfDay(zone).toInstant();
    Instant end = plan.weekEndDate().plusDays(1).atStartOfDay(zone).toInstant();
    List<WeeklyPlanTimeBlock> blocks = schedule.getScheduledBlocks(plan.userId(), start, end);
    int overlaps = 0;
    for (int left = 0; left < blocks.size(); left++) {
      for (int right = left + 1; right < blocks.size(); right++) {
        if (blocks.get(left).startAt().isBefore(blocks.get(right).endAt())
            && blocks.get(left).endAt().isAfter(blocks.get(right).startAt())) {
          overlaps++;
        }
      }
    }
    return new WeeklyPlanConflictSummary(
        planItems.stream().mapToInt(WeeklyPlanItem::plannedMinutes).sum(),
        plan.capacities().stream().mapToInt(WeeklyPlanCapacity::availableMinutes).sum(),
        overcapacityMinutes,
        overcapacityDates,
        overlaps,
        unscheduled,
        outcomesWithoutItems);
  }

  private WeeklyPlan owned(UUID userId, UUID planId) {
    return repository
        .findByIdAndUserId(planId, userId)
        .orElseThrow(() -> new ResourceNotFoundException("Weekly Plan not found"));
  }

  private static WeeklyPlanItem copyWithSnapshot(WeeklyPlanItem item, WeeklyPlanTaskSummary task) {
    return new WeeklyPlanItem(
        item.id(),
        item.taskId(),
        item.outcomeId(),
        item.plannedDate(),
        item.plannedMinutes(),
        item.position(),
        task.title(),
        task.status());
  }

  private static void requireDraft(WeeklyPlan plan) {
    if (plan.status() != WeeklyPlanStatus.DRAFT) {
      throw new WeeklyPlanStateConflictException("Finalized Weekly Plans are immutable");
    }
  }

  private static void checkVersion(WeeklyPlan plan, long version) {
    if (version < 0 || plan.version() != version) {
      throw new ConcurrencyConflictException("Weekly Plan version is stale");
    }
  }

  private static FieldValidationException validation(String field, String code) {
    return new FieldValidationException(
        "Invalid Weekly Plan", List.of(new FieldProblem(field, code)));
  }

  private record ReopenedContent(List<WeeklyPlanOutcome> outcomes, List<WeeklyPlanItem> items) {}
}
