package tech.buildwithpartha.lifeos.task.application;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceFrequency;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceOccurrenceEngine;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskException;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeries;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeriesRepository;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

/** Service responsible for idempotent occurrence generation of recurring task series. */
@Service
@Transactional
public class RecurrenceGenerationService {

  private final TaskRepository taskRepository;
  private final RecurringTaskSeriesRepository seriesRepository;
  private final ProductActivityPort activityPort;

  public RecurrenceGenerationService(
      TaskRepository taskRepository,
      RecurringTaskSeriesRepository seriesRepository,
      ProductActivityPort activityPort) {
    this.taskRepository = taskRepository;
    this.seriesRepository = seriesRepository;
    this.activityPort = activityPort;
  }

  /**
   * Generates task occurrences for a given series up to {@code horizon}. Idempotent: skips dates
   * that already have task occurrences or series exceptions.
   */
  public int generateOccurrencesForSeries(RecurringTaskSeries series, LocalDate horizon) {
    Objects.requireNonNull(series, "series must not be null");
    Objects.requireNonNull(horizon, "horizon must not be null");

    if (series.archivedAt().isPresent() || series.deletedAt().isPresent()) {
      return 0;
    }

    List<LocalDate> candidateDates =
        RecurrenceOccurrenceEngine.generateOccurrenceDates(series, horizon);
    if (candidateDates.isEmpty()) {
      return 0;
    }

    List<Task> existingTasks = taskRepository.findByRecurringSeriesId(series.id());
    Set<LocalDate> existingTaskDates =
        existingTasks.stream()
            .map(Task::recurrenceOccurrenceDate)
            .flatMap(Optional::stream)
            .collect(Collectors.toSet());

    List<RecurringTaskException> exceptions =
        seriesRepository.findExceptionsBySeriesId(series.id());
    Set<LocalDate> exceptionDates =
        exceptions.stream().map(RecurringTaskException::occurrenceDate).collect(Collectors.toSet());

    Instant now = Instant.now();
    ZoneId zoneId = ZoneId.of(series.timeZone());
    int createdCount = 0;

    for (LocalDate occurrenceDate : candidateDates) {
      if (existingTaskDates.contains(occurrenceDate) || exceptionDates.contains(occurrenceDate)) {
        continue;
      }

      Instant dueAt = occurrenceDate.atTime(23, 59, 59).atZone(zoneId).toInstant();
      Task newTask =
          new Task(
              UUID.randomUUID(),
              series.userId(),
              series.projectId(),
              series.title(),
              series.description(),
              TaskStatus.TO_DO,
              series.priority(),
              Optional.of(dueAt),
              series.estimateMinutes(),
              0,
              0,
              Optional.empty(),
              0,
              Optional.empty(),
              Optional.empty(),
              now,
              now,
              List.of(),
              Set.of(),
              Optional.of(series.id()),
              Optional.of(occurrenceDate),
              0L);

      Task saved = taskRepository.save(newTask);
      activityPort.record(
          new ProductActivityCommand(
              series.userId(),
              series.userId(),
              ActivityEventType.TASK_CREATED,
              ActivitySubjectType.TASK,
              saved.id()));
      createdCount++;
    }

    return createdCount;
  }

  /** Generates task occurrences for all active recurring series of a user up to {@code horizon}. */
  public int generateOccurrencesForUser(UUID userId, LocalDate horizon) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(horizon, "horizon must not be null");

    List<RecurringTaskSeries> activeSeries = seriesRepository.findActiveByUserId(userId);
    int totalCreated = 0;
    for (RecurringTaskSeries series : activeSeries) {
      totalCreated += generateOccurrencesForSeries(series, horizon);
    }
    return totalCreated;
  }

  /**
   * Triggers next occurrence calculation upon completion of a task. If the completed task belongs
   * to an AFTER_COMPLETION series, generates the next occurrence.
   */
  public Optional<Task> handleTaskCompletion(Task completedTask) {
    Objects.requireNonNull(completedTask, "completedTask must not be null");

    if (completedTask.recurringSeriesId().isEmpty()) {
      return Optional.empty();
    }

    UUID seriesId = completedTask.recurringSeriesId().get();
    Optional<RecurringTaskSeries> seriesOpt = seriesRepository.findById(seriesId);
    if (seriesOpt.isEmpty()) {
      return Optional.empty();
    }

    RecurringTaskSeries series = seriesOpt.get();
    if (series.archivedAt().isPresent() || series.deletedAt().isPresent()) {
      return Optional.empty();
    }

    ZoneId zoneId = ZoneId.of(series.timeZone());

    if (series.frequency() == RecurrenceFrequency.AFTER_COMPLETION) {
      LocalDate completionLocalDate = completedTask.updatedAt().atZone(zoneId).toLocalDate();
      LocalDate nextOccurrenceDate = completionLocalDate.plusDays(series.intervalValue());

      List<Task> existingTasks = taskRepository.findByRecurringSeriesId(series.id());
      boolean dateExists =
          existingTasks.stream()
              .map(Task::recurrenceOccurrenceDate)
              .flatMap(Optional::stream)
              .anyMatch(d -> d.equals(nextOccurrenceDate));

      if (dateExists) {
        return Optional.empty();
      }

      Instant dueAt = nextOccurrenceDate.atTime(23, 59, 59).atZone(zoneId).toInstant();
      Instant now = Instant.now();

      Task nextTask =
          new Task(
              UUID.randomUUID(),
              series.userId(),
              series.projectId(),
              series.title(),
              series.description(),
              TaskStatus.TO_DO,
              series.priority(),
              Optional.of(dueAt),
              series.estimateMinutes(),
              0,
              0,
              Optional.empty(),
              0,
              Optional.empty(),
              Optional.empty(),
              now,
              now,
              List.of(),
              Set.of(),
              Optional.of(series.id()),
              Optional.of(nextOccurrenceDate),
              0L);

      Task saved = taskRepository.save(nextTask);
      activityPort.record(
          new ProductActivityCommand(
              series.userId(),
              series.userId(),
              ActivityEventType.TASK_CREATED,
              ActivitySubjectType.TASK,
              saved.id()));
      return Optional.of(saved);
    } else {
      // For calendar-based series, ensure occurrences are generated up to current date horizon
      LocalDate todayInZone = LocalDate.now(zoneId);
      generateOccurrencesForSeries(series, todayInZone.plusDays(7));
      return Optional.empty();
    }
  }
}
