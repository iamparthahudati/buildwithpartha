package tech.buildwithpartha.lifeos.task.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceEndMode;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceFrequency;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeries;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeriesRepository;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

class RecurrenceGenerationServiceTests {

  private TaskRepository taskRepository;
  private RecurringTaskSeriesRepository seriesRepository;
  private ProductActivityPort activityPort;
  private RecurrenceGenerationService service;

  private final UUID userId = UUID.randomUUID();
  private final Instant now = Instant.parse("2026-09-01T08:00:00Z");

  @BeforeEach
  void setUp() {
    taskRepository = mock(TaskRepository.class);
    seriesRepository = mock(RecurringTaskSeriesRepository.class);
    activityPort = mock(ProductActivityPort.class);
    service = new RecurrenceGenerationService(taskRepository, seriesRepository, activityPort);
  }

  @Test
  @DisplayName("Returns 0 when generating occurrences for archived or deleted series")
  void returnsZeroForArchivedOrDeletedSeries() {
    RecurringTaskSeries series =
        new RecurringTaskSeries(
            UUID.randomUUID(),
            userId,
            "Archived Series",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P2,
            Optional.empty(),
            30,
            RecurrenceFrequency.DAILY,
            1,
            Optional.empty(),
            Optional.empty(),
            RecurrenceEndMode.NEVER,
            Optional.empty(),
            Optional.empty(),
            LocalDate.of(2026, 9, 1),
            "UTC",
            Optional.of(now),
            Optional.empty(),
            now,
            now,
            0L);

    int created = service.generateOccurrencesForSeries(series, LocalDate.of(2026, 9, 5));
    assertThat(created).isZero();
    verify(taskRepository, never()).save(any());
  }

  @Test
  @DisplayName("Generates occurrences for all active series of a user")
  void generatesOccurrencesForUser() {
    RecurringTaskSeries series =
        new RecurringTaskSeries(
            UUID.randomUUID(),
            userId,
            "Daily Routine",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P2,
            Optional.empty(),
            30,
            RecurrenceFrequency.DAILY,
            1,
            Optional.empty(),
            Optional.empty(),
            RecurrenceEndMode.NEVER,
            Optional.empty(),
            Optional.empty(),
            LocalDate.of(2026, 9, 1),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            0L);

    when(seriesRepository.findActiveByUserId(userId)).thenReturn(List.of(series));
    when(taskRepository.findByRecurringSeriesId(series.id())).thenReturn(List.of());
    when(seriesRepository.findExceptionsBySeriesId(series.id())).thenReturn(List.of());
    when(taskRepository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));

    int created = service.generateOccurrencesForUser(userId, LocalDate.of(2026, 9, 2));

    assertThat(created).isEqualTo(2);
  }

  @Test
  @DisplayName("Handles completion for non-recurring task")
  void handlesTaskCompletionNonRecurring() {
    Task normalTask =
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            "Normal Task",
            Optional.empty(),
            TaskStatus.DONE,
            TaskPriority.P2,
            Optional.empty(),
            30,
            0,
            100,
            Optional.empty(),
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            Set.of(),
            Optional.empty(),
            Optional.empty(),
            0L);

    Optional<Task> result = service.handleTaskCompletion(normalTask);
    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("Handles completion for AFTER_COMPLETION recurring task")
  void handlesTaskCompletionAfterCompletion() {
    UUID seriesId = UUID.randomUUID();
    RecurringTaskSeries series =
        new RecurringTaskSeries(
            seriesId,
            userId,
            "Water Plants",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P2,
            Optional.empty(),
            10,
            RecurrenceFrequency.AFTER_COMPLETION,
            3,
            Optional.empty(),
            Optional.empty(),
            RecurrenceEndMode.NEVER,
            Optional.empty(),
            Optional.empty(),
            LocalDate.of(2026, 9, 1),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            0L);

    Task completedTask =
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            "Water Plants",
            Optional.empty(),
            TaskStatus.DONE,
            TaskPriority.P2,
            Optional.empty(),
            10,
            0,
            100,
            Optional.empty(),
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            Set.of(),
            Optional.of(seriesId),
            Optional.of(LocalDate.of(2026, 9, 1)),
            0L);

    when(seriesRepository.findById(seriesId)).thenReturn(Optional.of(series));
    when(taskRepository.findByRecurringSeriesId(seriesId)).thenReturn(List.of(completedTask));
    when(taskRepository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));

    Optional<Task> nextTaskOpt = service.handleTaskCompletion(completedTask);

    assertThat(nextTaskOpt).isPresent();
    Task nextTask = nextTaskOpt.get();
    assertThat(nextTask.recurrenceOccurrenceDate()).contains(LocalDate.of(2026, 9, 4));
    verify(taskRepository).save(any(Task.class));
  }

  @Test
  @DisplayName("Handles completion for calendar-based DAILY series")
  void handlesTaskCompletionCalendarBased() {
    UUID seriesId = UUID.randomUUID();
    RecurringTaskSeries series =
        new RecurringTaskSeries(
            seriesId,
            userId,
            "Daily Workout",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P2,
            Optional.empty(),
            45,
            RecurrenceFrequency.DAILY,
            1,
            Optional.empty(),
            Optional.empty(),
            RecurrenceEndMode.NEVER,
            Optional.empty(),
            Optional.empty(),
            LocalDate.of(2026, 9, 1),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            0L);

    Task completedTask =
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            "Daily Workout",
            Optional.empty(),
            TaskStatus.DONE,
            TaskPriority.P2,
            Optional.empty(),
            45,
            0,
            100,
            Optional.empty(),
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            Set.of(),
            Optional.of(seriesId),
            Optional.of(LocalDate.of(2026, 9, 1)),
            0L);

    when(seriesRepository.findById(seriesId)).thenReturn(Optional.of(series));
    when(taskRepository.findByRecurringSeriesId(seriesId)).thenReturn(List.of(completedTask));
    when(seriesRepository.findExceptionsBySeriesId(seriesId)).thenReturn(List.of());
    when(taskRepository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));

    Optional<Task> result = service.handleTaskCompletion(completedTask);

    assertThat(result).isEmpty();
  }
}
