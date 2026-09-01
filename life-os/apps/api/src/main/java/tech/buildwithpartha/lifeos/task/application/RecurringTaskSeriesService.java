package tech.buildwithpartha.lifeos.task.application;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.project.ProjectOwnershipValidator;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceEditScope;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceExceptionType;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskException;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeries;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeriesRepository;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

/** Application service managing recurring task series lifecycle and scope-based mutations. */
@Service
@Transactional
public class RecurringTaskSeriesService {

  private final RecurringTaskSeriesRepository seriesRepository;
  private final TaskRepository taskRepository;
  private final RecurrenceGenerationService generationService;
  private final ProjectOwnershipValidator projectOwnershipValidator;
  private final ProductActivityPort activityPort;

  public RecurringTaskSeriesService(
      RecurringTaskSeriesRepository seriesRepository,
      TaskRepository taskRepository,
      RecurrenceGenerationService generationService,
      ProjectOwnershipValidator projectOwnershipValidator,
      ProductActivityPort activityPort) {
    this.seriesRepository = seriesRepository;
    this.taskRepository = taskRepository;
    this.generationService = generationService;
    this.projectOwnershipValidator = projectOwnershipValidator;
    this.activityPort = activityPort;
  }

  public RecurringTaskSeries createSeries(UUID userId, CreateRecurringTaskSeriesCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    command.projectId().ifPresent(id -> projectOwnershipValidator.validateAssignment(userId, id));

    Instant now = Instant.now();
    RecurringTaskSeries series =
        new RecurringTaskSeries(
            UUID.randomUUID(),
            userId,
            command.title().trim(),
            command.description().map(String::trim),
            TaskStatus.TO_DO,
            command.priority(),
            command.projectId(),
            command.estimateMinutes(),
            command.frequency(),
            command.intervalValue(),
            command.daysOfWeek(),
            command.dayOfMonth(),
            command.endMode(),
            command.endDate(),
            command.endCount(),
            command.startDate(),
            command.timeZone(),
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            0L);

    RecurringTaskSeries saved = seriesRepository.save(series);
    LocalDate horizon = LocalDate.now(ZoneId.of(saved.timeZone())).plusDays(7);
    generationService.generateOccurrencesForSeries(saved, horizon);

    activityPort.record(
        new ProductActivityCommand(
            userId, userId, ActivityEventType.TASK_CREATED, ActivitySubjectType.TASK, saved.id()));

    return saved;
  }

  public RecurringTaskSeries getSeries(UUID userId, UUID seriesId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(seriesId, "seriesId must not be null");

    return seriesRepository
        .findByIdAndUserId(seriesId, userId)
        .filter(s -> s.deletedAt().isEmpty())
        .orElseThrow(
            () -> new ResourceNotFoundException("Recurring task series not found: " + seriesId));
  }

  public List<RecurringTaskSeries> listSeries(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return seriesRepository.findActiveByUserId(userId);
  }

  public RecurringTaskSeries updateSeries(
      UUID userId,
      UUID seriesId,
      UpdateRecurringTaskSeriesCommand command,
      RecurrenceEditScope scope,
      Optional<LocalDate> occurrenceDate) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(seriesId, "seriesId must not be null");
    Objects.requireNonNull(command, "command must not be null");
    Objects.requireNonNull(scope, "scope must not be null");

    RecurringTaskSeries existing = getSeries(userId, seriesId);
    command.projectId().ifPresent(id -> projectOwnershipValidator.validateAssignment(userId, id));

    Instant now = Instant.now();

    if (scope == RecurrenceEditScope.SERIES) {
      RecurringTaskSeries updated =
          new RecurringTaskSeries(
              existing.id(),
              existing.userId(),
              command.title().trim(),
              command.description().map(String::trim),
              existing.status(),
              command.priority(),
              command.projectId(),
              command.estimateMinutes(),
              command.frequency(),
              command.intervalValue(),
              command.daysOfWeek(),
              command.dayOfMonth(),
              command.endMode(),
              command.endDate(),
              command.endCount(),
              command.startDate(),
              command.timeZone(),
              existing.archivedAt(),
              existing.deletedAt(),
              existing.createdAt(),
              now,
              existing.version());

      RecurringTaskSeries saved = seriesRepository.save(updated);

      // Sync uncompleted future task occurrences
      List<Task> seriesTasks = taskRepository.findByRecurringSeriesId(seriesId);
      for (Task task : seriesTasks) {
        if (task.status() != TaskStatus.DONE && !task.isDeleted()) {
          Task updatedTask =
              task.withUpdates(
                  command.projectId(),
                  command.title().trim(),
                  command.description().map(String::trim),
                  task.status(),
                  command.priority(),
                  task.dueAt(),
                  command.estimateMinutes(),
                  task.spentMinutes(),
                  task.progress(),
                  task.mitDate(),
                  task.position(),
                  now);
          taskRepository.save(updatedTask);
        }
      }

      LocalDate horizon = LocalDate.now(ZoneId.of(saved.timeZone())).plusDays(7);
      generationService.generateOccurrencesForSeries(saved, horizon);
      return saved;

    } else if (scope == RecurrenceEditScope.THIS_AND_FUTURE && occurrenceDate.isPresent()) {
      LocalDate editDate = occurrenceDate.get();

      // Truncate existing series to end before editDate
      RecurringTaskSeries truncated =
          new RecurringTaskSeries(
              existing.id(),
              existing.userId(),
              existing.title(),
              existing.description(),
              existing.status(),
              existing.priority(),
              existing.projectId(),
              existing.estimateMinutes(),
              existing.frequency(),
              existing.intervalValue(),
              existing.daysOfWeek(),
              existing.dayOfMonth(),
              tech.buildwithpartha.lifeos.task.domain.RecurrenceEndMode.UNTIL_DATE,
              Optional.of(editDate.minusDays(1)),
              Optional.empty(),
              existing.startDate(),
              existing.timeZone(),
              existing.archivedAt(),
              existing.deletedAt(),
              existing.createdAt(),
              now,
              existing.version());
      seriesRepository.save(truncated);

      // Create new series starting at editDate
      CreateRecurringTaskSeriesCommand newSeriesCmd =
          new CreateRecurringTaskSeriesCommand(
              command.title(),
              command.description(),
              command.priority(),
              command.projectId(),
              command.estimateMinutes(),
              command.frequency(),
              command.intervalValue(),
              command.daysOfWeek(),
              command.dayOfMonth(),
              command.endMode(),
              command.endDate(),
              command.endCount(),
              editDate,
              command.timeZone());

      return createSeries(userId, newSeriesCmd);

    } else {
      // THIS_OCCURRENCE
      if (occurrenceDate.isPresent()) {
        LocalDate targetDate = occurrenceDate.get();
        List<Task> seriesTasks = taskRepository.findByRecurringSeriesId(seriesId);
        Optional<Task> targetTask =
            seriesTasks.stream()
                .filter(t -> t.recurrenceOccurrenceDate().map(targetDate::equals).orElse(false))
                .findFirst();

        if (targetTask.isPresent()) {
          Task t = targetTask.get();
          Task updatedTask =
              t.withUpdates(
                  command.projectId(),
                  command.title().trim(),
                  command.description().map(String::trim),
                  t.status(),
                  command.priority(),
                  t.dueAt(),
                  command.estimateMinutes(),
                  t.spentMinutes(),
                  t.progress(),
                  t.mitDate(),
                  t.position(),
                  now);
          taskRepository.save(updatedTask);

          RecurringTaskException exception =
              new RecurringTaskException(
                  UUID.randomUUID(),
                  seriesId,
                  userId,
                  targetDate,
                  RecurrenceExceptionType.OVERRIDDEN,
                  Optional.empty(),
                  Optional.of(t.id()),
                  Optional.of("Overridden single occurrence"),
                  now);
          seriesRepository.saveException(exception);
        }
      }
      return existing;
    }
  }

  public void deleteSeries(UUID userId, UUID seriesId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(seriesId, "seriesId must not be null");

    RecurringTaskSeries series = getSeries(userId, seriesId);
    Instant now = Instant.now();

    RecurringTaskSeries deleted =
        new RecurringTaskSeries(
            series.id(),
            series.userId(),
            series.title(),
            series.description(),
            series.status(),
            series.priority(),
            series.projectId(),
            series.estimateMinutes(),
            series.frequency(),
            series.intervalValue(),
            series.daysOfWeek(),
            series.dayOfMonth(),
            series.endMode(),
            series.endDate(),
            series.endCount(),
            series.startDate(),
            series.timeZone(),
            series.archivedAt(),
            Optional.of(now),
            series.createdAt(),
            now,
            series.version());

    seriesRepository.save(deleted);

    List<Task> tasks = taskRepository.findByRecurringSeriesId(seriesId);
    for (Task task : tasks) {
      if (task.status() != TaskStatus.DONE && !task.isDeleted()) {
        taskRepository.deleteById(task.id());
      }
    }

    activityPort.record(
        new ProductActivityCommand(
            userId, userId, ActivityEventType.TASK_DELETED, ActivitySubjectType.TASK, seriesId));
  }

  public void skipOccurrence(
      UUID userId, UUID seriesId, LocalDate occurrenceDate, Optional<String> reason) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(seriesId, "seriesId must not be null");
    Objects.requireNonNull(occurrenceDate, "occurrenceDate must not be null");

    RecurringTaskSeries series = getSeries(userId, seriesId);
    Instant now = Instant.now();

    RecurringTaskException exception =
        new RecurringTaskException(
            UUID.randomUUID(),
            series.id(),
            userId,
            occurrenceDate,
            RecurrenceExceptionType.SKIPPED,
            Optional.empty(),
            Optional.empty(),
            reason,
            now);

    seriesRepository.saveException(exception);

    List<Task> tasks = taskRepository.findByRecurringSeriesId(seriesId);
    Optional<Task> taskOpt =
        tasks.stream()
            .filter(t -> t.recurrenceOccurrenceDate().map(occurrenceDate::equals).orElse(false))
            .findFirst();

    if (taskOpt.isPresent()) {
      taskRepository.deleteById(taskOpt.get().id());
    }

    activityPort.record(
        new ProductActivityCommand(
            userId, userId, ActivityEventType.TASK_UPDATED, ActivitySubjectType.TASK, seriesId));
  }

  public List<RecurringTaskException> listExceptions(UUID userId, UUID seriesId) {
    getSeries(userId, seriesId); // Validate ownership
    return seriesRepository.findExceptionsBySeriesId(seriesId);
  }
}
