package tech.buildwithpartha.lifeos.sprint.application;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.error.SprintStateConflictException;
import tech.buildwithpartha.lifeos.common.task.SprintTaskPort;
import tech.buildwithpartha.lifeos.common.task.SprintTaskSummary;
import tech.buildwithpartha.lifeos.sprint.domain.Sprint;
import tech.buildwithpartha.lifeos.sprint.domain.SprintEvent;
import tech.buildwithpartha.lifeos.sprint.domain.SprintEventType;
import tech.buildwithpartha.lifeos.sprint.domain.SprintRepository;
import tech.buildwithpartha.lifeos.sprint.domain.SprintStatus;
import tech.buildwithpartha.lifeos.sprint.domain.SprintTask;

@Service
@Transactional
public class SprintService {
  private final SprintRepository repository;
  private final SprintTaskPort taskPort;

  public SprintService(SprintRepository repository, SprintTaskPort taskPort) {
    this.repository = repository;
    this.taskPort = taskPort;
  }

  public Sprint create(UUID userId, CreateSprintCommand command) {
    repository.lockUser(userId);
    validateDates(command.startDate(), command.endDate());
    validateCapacity(command.targetCapacityPoints());
    rejectOverlap(userId, command.startDate(), command.endDate(), null);
    validateUniqueTasks(command.tasks());
    Instant now = Instant.now();
    List<SprintTask> tasks =
        command.tasks().stream()
            .map(
                input -> {
                  taskPort.getAvailableTask(userId, input.taskId());
                  validatePoints(input.storyPoints());
                  return new SprintTask(
                      UUID.randomUUID(),
                      input.taskId(),
                      input.storyPoints(),
                      input.position(),
                      false,
                      now,
                      Optional.empty(),
                      Optional.empty());
                })
            .toList();
    Sprint sprint =
        new Sprint(
            UUID.randomUUID(),
            userId,
            command.name().trim(),
            clean(command.goal()),
            command.startDate(),
            command.endDate(),
            SprintStatus.PLANNED,
            command.targetCapacityPoints(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            List.of(),
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            Optional.empty(),
            now,
            now,
            tasks,
            List.of(SprintEvent.of(SprintEventType.CREATED, null, null, null, now)),
            0L);
    return repository.save(sprint);
  }

  @Transactional(readOnly = true)
  public Sprint get(UUID userId, UUID sprintId) {
    return repository
        .findByIdAndUserId(sprintId, userId)
        .orElseThrow(() -> new ResourceNotFoundException("Sprint not found"));
  }

  @Transactional(readOnly = true)
  public List<Sprint> list(UUID userId, Set<SprintStatus> statuses) {
    return repository.findByUserId(userId).stream()
        .filter(
            sprint -> statuses == null || statuses.isEmpty() || statuses.contains(sprint.status()))
        .toList();
  }

  public Sprint update(UUID userId, UUID sprintId, UpdateSprintCommand command) {
    repository.lockUser(userId);
    Sprint sprint = get(userId, sprintId);
    checkVersion(sprint, command.version());
    if (sprint.status() == SprintStatus.COMPLETED || sprint.status() == SprintStatus.CANCELLED) {
      throw new SprintStateConflictException("Terminal Sprints cannot be edited");
    }
    validateDates(command.startDate(), command.endDate());
    validateCapacity(command.targetCapacityPoints());
    rejectOverlap(userId, command.startDate(), command.endDate(), sprintId);
    Instant now = Instant.now();
    List<SprintEvent> events = new ArrayList<>(sprint.events());
    if (!sprint.goal().equals(clean(command.goal()))) {
      events.add(SprintEvent.of(SprintEventType.GOAL_CHANGED, null, null, null, now));
    }
    if (sprint.targetCapacityPoints() != command.targetCapacityPoints()) {
      events.add(
          SprintEvent.of(
              SprintEventType.CAPACITY_CHANGED,
              null,
              command.targetCapacityPoints() - sprint.targetCapacityPoints(),
              null,
              now));
    }
    events.add(SprintEvent.of(SprintEventType.UPDATED, null, null, null, now));
    return repository.save(
        copy(
            sprint,
            command.name().trim(),
            clean(command.goal()),
            command.startDate(),
            command.endDate(),
            sprint.status(),
            command.targetCapacityPoints(),
            sprint.retrospectiveNotes(),
            sprint.whatWentWell(),
            sprint.whatCouldBeImproved(),
            sprint.actionItems(),
            sprint.committedTaskCount(),
            sprint.completedTaskCount(),
            sprint.addedTaskCount(),
            sprint.removedTaskCount(),
            sprint.carriedOverTaskCount(),
            sprint.totalStoryPoints(),
            sprint.completedStoryPoints(),
            sprint.completedAt(),
            sprint.tasks(),
            events,
            now));
  }

  public Sprint addTask(
      UUID userId, UUID sprintId, SprintTaskInput input, String reason, long version) {
    Sprint sprint = get(userId, sprintId);
    checkMutable(sprint);
    checkVersion(sprint, version);
    validatePoints(input.storyPoints());
    taskPort.getAvailableTask(userId, input.taskId());
    if (sprint.tasks().stream().anyMatch(task -> task.taskId().equals(input.taskId()))) {
      throw validation("taskId", "DUPLICATE");
    }
    Instant now = Instant.now();
    List<SprintTask> tasks = new ArrayList<>(sprint.tasks());
    tasks.add(
        new SprintTask(
            UUID.randomUUID(),
            input.taskId(),
            input.storyPoints(),
            input.position(),
            sprint.status() == SprintStatus.ACTIVE,
            now,
            Optional.empty(),
            Optional.empty()));
    List<SprintEvent> events =
        append(
            sprint.events(),
            SprintEvent.of(
                SprintEventType.TASK_ADDED, input.taskId(), input.storyPoints(), reason, now));
    return repository.save(copy(sprint, tasks, events, now));
  }

  public Sprint updateTask(
      UUID userId,
      UUID sprintId,
      UUID taskId,
      int points,
      int position,
      String reason,
      long version) {
    Sprint sprint = get(userId, sprintId);
    checkMutable(sprint);
    checkVersion(sprint, version);
    validatePoints(points);
    Instant now = Instant.now();
    boolean found = false;
    List<SprintTask> tasks = new ArrayList<>();
    List<SprintEvent> events = new ArrayList<>(sprint.events());
    for (SprintTask task : sprint.tasks()) {
      if (task.taskId().equals(taskId) && task.active()) {
        found = true;
        int delta = points - task.storyPoints();
        tasks.add(task.withPlanning(points, position));
        if (delta != 0) {
          events.add(SprintEvent.of(SprintEventType.POINTS_CHANGED, taskId, delta, reason, now));
        }
      } else {
        tasks.add(task);
      }
    }
    if (!found) {
      throw new ResourceNotFoundException("Sprint task not found");
    }
    return repository.save(copy(sprint, tasks, events, now));
  }

  public Sprint removeTask(UUID userId, UUID sprintId, UUID taskId, String reason, long version) {
    Sprint sprint = get(userId, sprintId);
    checkMutable(sprint);
    checkVersion(sprint, version);
    Instant now = Instant.now();
    boolean found = false;
    List<SprintTask> tasks = new ArrayList<>();
    for (SprintTask task : sprint.tasks()) {
      if (task.taskId().equals(taskId) && task.active()) {
        found = true;
        tasks.add(task.remove(now));
      } else {
        tasks.add(task);
      }
    }
    if (!found) {
      throw new ResourceNotFoundException("Sprint task not found");
    }
    return repository.save(
        copy(
            sprint,
            tasks,
            append(
                sprint.events(),
                SprintEvent.of(SprintEventType.TASK_REMOVED, taskId, null, reason, now)),
            now));
  }

  public Sprint start(UUID userId, UUID sprintId, long version) {
    repository.lockUser(userId);
    Sprint sprint = get(userId, sprintId);
    checkVersion(sprint, version);
    if (sprint.status() != SprintStatus.PLANNED) {
      throw new SprintStateConflictException("Only a planned Sprint can start");
    }
    if (repository.findByUserId(userId).stream()
        .anyMatch(item -> item.status() == SprintStatus.ACTIVE)) {
      throw new SprintStateConflictException("The Account already has an active Sprint");
    }
    Instant now = Instant.now();
    return repository.save(
        copy(
            sprint,
            SprintStatus.ACTIVE,
            append(sprint.events(), SprintEvent.of(SprintEventType.STARTED, null, null, null, now)),
            now));
  }

  public Sprint complete(UUID userId, UUID sprintId, CompleteSprintCommand command) {
    repository.lockUser(userId);
    Sprint sprint = get(userId, sprintId);
    checkVersion(sprint, command.version());
    if (sprint.status() != SprintStatus.ACTIVE) {
      throw new SprintStateConflictException("Only an active Sprint can complete");
    }
    Sprint target = null;
    if (command.carryOverDestination() == CompleteSprintCommand.CarryOverDestination.NEXT_SPRINT) {
      UUID targetId =
          command.targetSprintId().orElseThrow(() -> validation("targetSprintId", "REQUIRED"));
      target = get(userId, targetId);
      checkVersion(
          target,
          command.targetVersion().orElseThrow(() -> validation("targetVersion", "REQUIRED")));
      if (target.status() != SprintStatus.PLANNED) {
        throw new SprintStateConflictException("Carry-over target must be planned");
      }
    }
    Instant now = Instant.now();
    List<SprintTask> sourceTasks = new ArrayList<>();
    List<SprintTask> carry = new ArrayList<>();
    int completed = 0;
    int totalPoints = 0;
    int completedPoints = 0;
    for (SprintTask task : sprint.tasks()) {
      if (!task.active()) {
        sourceTasks.add(task);
        continue;
      }
      SprintTaskSummary summary = taskPort.getTask(userId, task.taskId());
      totalPoints += task.storyPoints();
      if ("DONE".equals(summary.status())) {
        completed++;
        completedPoints += task.storyPoints();
        sourceTasks.add(task);
      } else if (target != null) {
        carry.add(task);
        sourceTasks.add(task.carryOver(target.id()));
      } else {
        sourceTasks.add(task);
      }
    }
    int removed = (int) sprint.tasks().stream().filter(task -> !task.active()).count();
    int added = (int) sprint.tasks().stream().filter(SprintTask::addedAfterStart).count();
    List<SprintEvent> sourceEvents =
        append(sprint.events(), SprintEvent.of(SprintEventType.COMPLETED, null, null, null, now));
    if (!carry.isEmpty()) {
      sourceEvents =
          append(sourceEvents, SprintEvent.of(SprintEventType.CARRIED_OVER, null, null, null, now));
    }
    Sprint completedSprint =
        copy(
            sprint,
            sprint.name(),
            sprint.goal(),
            sprint.startDate(),
            sprint.endDate(),
            SprintStatus.COMPLETED,
            sprint.targetCapacityPoints(),
            clean(command.retrospectiveNotes()),
            clean(command.whatWentWell()),
            clean(command.whatCouldBeImproved()),
            cleanItems(command.actionItems()),
            sprint.activeTasks().size(),
            completed,
            added,
            removed,
            carry.size(),
            totalPoints,
            completedPoints,
            Optional.of(now),
            sourceTasks,
            sourceEvents,
            now);
    if (target != null) {
      Set<UUID> existing = new HashSet<>();
      target.tasks().forEach(task -> existing.add(task.taskId()));
      List<SprintTask> targetTasks = new ArrayList<>(target.tasks());
      List<SprintEvent> targetEvents = new ArrayList<>(target.events());
      for (SprintTask task : carry) {
        if (existing.add(task.taskId())) {
          targetTasks.add(
              new SprintTask(
                  UUID.randomUUID(),
                  task.taskId(),
                  task.storyPoints(),
                  targetTasks.size(),
                  false,
                  now,
                  Optional.empty(),
                  Optional.empty()));
          targetEvents.add(
              SprintEvent.of(
                  SprintEventType.CARRIED_OVER, task.taskId(), task.storyPoints(), null, now));
        }
      }
      repository.save(copy(target, targetTasks, targetEvents, now));
    }
    return repository.save(completedSprint);
  }

  public Sprint cancel(UUID userId, UUID sprintId, long version) {
    Sprint sprint = get(userId, sprintId);
    checkVersion(sprint, version);
    if (sprint.status() == SprintStatus.COMPLETED || sprint.status() == SprintStatus.CANCELLED) {
      throw new SprintStateConflictException("Sprint is already terminal");
    }
    Instant now = Instant.now();
    return repository.save(
        copy(
            sprint,
            SprintStatus.CANCELLED,
            append(
                sprint.events(), SprintEvent.of(SprintEventType.CANCELLED, null, null, null, now)),
            now));
  }

  public void delete(UUID userId, UUID sprintId, long version) {
    Sprint sprint = get(userId, sprintId);
    checkVersion(sprint, version);
    if (sprint.status() != SprintStatus.PLANNED) {
      throw new SprintStateConflictException("Only planned Sprints can be deleted");
    }
    repository.delete(sprint);
  }

  private void rejectOverlap(UUID userId, LocalDate start, LocalDate end, UUID excludeId) {
    if (repository.hasOverlap(userId, start, end, excludeId)) {
      throw validation("startDate", "OVERLAPS_SPRINT");
    }
  }

  private static void validateDates(LocalDate start, LocalDate end) {
    if (end.isBefore(start)) {
      throw validation("endDate", "BEFORE_START_DATE");
    }
  }

  private static void validateCapacity(int value) {
    if (value < 0) {
      throw validation("targetCapacityPoints", "MIN");
    }
  }

  private static void validatePoints(int value) {
    if (value < 0) {
      throw validation("storyPoints", "MIN");
    }
  }

  private static void validateUniqueTasks(List<SprintTaskInput> tasks) {
    Set<UUID> ids = new HashSet<>();
    for (SprintTaskInput task : tasks) {
      if (!ids.add(task.taskId())) {
        throw validation("tasks", "DUPLICATE");
      }
    }
  }

  private static void checkVersion(Sprint sprint, long version) {
    if (sprint.version() != version) {
      throw new ConcurrencyConflictException("Stale Sprint version");
    }
  }

  private static void checkMutable(Sprint sprint) {
    if (sprint.status() == SprintStatus.COMPLETED || sprint.status() == SprintStatus.CANCELLED) {
      throw new SprintStateConflictException("Terminal Sprint scope is immutable");
    }
  }

  private static FieldValidationException validation(String field, String code) {
    return new FieldValidationException(
        "Validation failed", List.of(new FieldProblem(field, code)));
  }

  private static Optional<String> clean(Optional<String> value) {
    return value.map(String::trim).filter(text -> !text.isEmpty());
  }

  private static List<String> cleanItems(List<String> items) {
    return items.stream().map(String::trim).filter(item -> !item.isEmpty()).toList();
  }

  private static List<SprintEvent> append(List<SprintEvent> events, SprintEvent event) {
    List<SprintEvent> result = new ArrayList<>(events);
    result.add(event);
    return result;
  }

  private static Sprint copy(
      Sprint s, List<SprintTask> tasks, List<SprintEvent> events, Instant now) {
    return copy(
        s,
        s.name(),
        s.goal(),
        s.startDate(),
        s.endDate(),
        s.status(),
        s.targetCapacityPoints(),
        s.retrospectiveNotes(),
        s.whatWentWell(),
        s.whatCouldBeImproved(),
        s.actionItems(),
        s.committedTaskCount(),
        s.completedTaskCount(),
        s.addedTaskCount(),
        s.removedTaskCount(),
        s.carriedOverTaskCount(),
        s.totalStoryPoints(),
        s.completedStoryPoints(),
        s.completedAt(),
        tasks,
        events,
        now);
  }

  private static Sprint copy(Sprint s, SprintStatus status, List<SprintEvent> events, Instant now) {
    return copy(
        s,
        s.name(),
        s.goal(),
        s.startDate(),
        s.endDate(),
        status,
        s.targetCapacityPoints(),
        s.retrospectiveNotes(),
        s.whatWentWell(),
        s.whatCouldBeImproved(),
        s.actionItems(),
        s.committedTaskCount(),
        s.completedTaskCount(),
        s.addedTaskCount(),
        s.removedTaskCount(),
        s.carriedOverTaskCount(),
        s.totalStoryPoints(),
        s.completedStoryPoints(),
        s.completedAt(),
        s.tasks(),
        events,
        now);
  }

  private static Sprint copy(
      Sprint s,
      String name,
      Optional<String> goal,
      LocalDate start,
      LocalDate end,
      SprintStatus status,
      int capacity,
      Optional<String> retro,
      Optional<String> well,
      Optional<String> improve,
      List<String> actionItems,
      int committed,
      int completed,
      int added,
      int removed,
      int carried,
      int totalPoints,
      int completedPoints,
      Optional<Instant> completedAt,
      List<SprintTask> tasks,
      List<SprintEvent> events,
      Instant now) {
    return new Sprint(
        s.id(),
        s.userId(),
        name,
        goal,
        start,
        end,
        status,
        capacity,
        retro,
        well,
        improve,
        actionItems,
        committed,
        completed,
        added,
        removed,
        carried,
        totalPoints,
        completedPoints,
        completedAt,
        s.createdAt(),
        now,
        tasks,
        events,
        s.version());
  }
}
