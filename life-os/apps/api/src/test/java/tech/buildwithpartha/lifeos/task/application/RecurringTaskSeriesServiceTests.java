package tech.buildwithpartha.lifeos.task.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
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
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.project.ProjectOwnershipValidator;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceEditScope;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceEndMode;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceFrequency;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskException;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeries;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeriesRepository;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

class RecurringTaskSeriesServiceTests {

  private RecurringTaskSeriesRepository seriesRepository;
  private TaskRepository taskRepository;
  private RecurrenceGenerationService generationService;
  private ProjectOwnershipValidator projectOwnershipValidator;
  private ProductActivityPort activityPort;
  private RecurringTaskSeriesService service;

  private final UUID userId = UUID.randomUUID();
  private final Instant now = Instant.parse("2026-09-01T08:00:00Z");

  @BeforeEach
  void setUp() {
    seriesRepository = mock(RecurringTaskSeriesRepository.class);
    taskRepository = mock(TaskRepository.class);
    generationService = mock(RecurrenceGenerationService.class);
    projectOwnershipValidator = mock(ProjectOwnershipValidator.class);
    activityPort = mock(ProductActivityPort.class);

    service =
        new RecurringTaskSeriesService(
            seriesRepository,
            taskRepository,
            generationService,
            projectOwnershipValidator,
            activityPort);
  }

  @Test
  @DisplayName("Creates recurring series and triggers initial generation")
  void createsSeriesAndTriggersGeneration() {
    CreateRecurringTaskSeriesCommand command =
        new CreateRecurringTaskSeriesCommand(
            "Weekly Report",
            Optional.of("Weekly status update"),
            TaskPriority.P1,
            Optional.empty(),
            45,
            RecurrenceFrequency.WEEKLY,
            1,
            Optional.of("MONDAY"),
            Optional.empty(),
            RecurrenceEndMode.NEVER,
            Optional.empty(),
            Optional.empty(),
            LocalDate.of(2026, 9, 1),
            "UTC");

    when(seriesRepository.save(any(RecurringTaskSeries.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    RecurringTaskSeries created = service.createSeries(userId, command);

    assertThat(created.title()).isEqualTo("Weekly Report");
    assertThat(created.frequency()).isEqualTo(RecurrenceFrequency.WEEKLY);
    verify(seriesRepository).save(any(RecurringTaskSeries.class));
    verify(generationService).generateOccurrencesForSeries(any(), any());
    verify(activityPort).record(any());
  }

  @Test
  @DisplayName("Throws ResourceNotFoundException when series does not exist")
  void throwsNotFoundWhenSeriesMissing() {
    UUID missingId = UUID.randomUUID();
    when(seriesRepository.findByIdAndUserId(missingId, userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getSeries(userId, missingId))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("Updates entire series with SERIES edit scope and syncs uncompleted tasks")
  void updatesSeriesScopeSeries() {
    UUID seriesId = UUID.randomUUID();
    RecurringTaskSeries existing =
        new RecurringTaskSeries(
            seriesId,
            userId,
            "Old Title",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P3,
            Optional.empty(),
            15,
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

    Task uncompletedTask =
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            "Old Title",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P3,
            Optional.empty(),
            15,
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
            Optional.of(seriesId),
            Optional.of(LocalDate.of(2026, 9, 1)),
            0L);

    UpdateRecurringTaskSeriesCommand command =
        new UpdateRecurringTaskSeriesCommand(
            "New Title",
            Optional.of("New Desc"),
            TaskPriority.P1,
            Optional.empty(),
            20,
            RecurrenceFrequency.DAILY,
            1,
            Optional.empty(),
            Optional.empty(),
            RecurrenceEndMode.NEVER,
            Optional.empty(),
            Optional.empty(),
            LocalDate.of(2026, 9, 1),
            "UTC");

    when(seriesRepository.findByIdAndUserId(seriesId, userId)).thenReturn(Optional.of(existing));
    when(seriesRepository.save(any(RecurringTaskSeries.class))).thenAnswer(i -> i.getArgument(0));
    when(taskRepository.findByRecurringSeriesId(seriesId)).thenReturn(List.of(uncompletedTask));
    when(taskRepository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));

    RecurringTaskSeries updated =
        service.updateSeries(
            userId, seriesId, command, RecurrenceEditScope.SERIES, Optional.empty());

    assertThat(updated.title()).isEqualTo("New Title");
    assertThat(updated.priority()).isEqualTo(TaskPriority.P1);
    verify(seriesRepository).save(any(RecurringTaskSeries.class));
    verify(taskRepository).save(any(Task.class));
  }

  @Test
  @DisplayName("Updates series with THIS_AND_FUTURE edit scope")
  void updatesSeriesScopeThisAndFuture() {
    UUID seriesId = UUID.randomUUID();
    RecurringTaskSeries existing =
        new RecurringTaskSeries(
            seriesId,
            userId,
            "Original Series",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P3,
            Optional.empty(),
            15,
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

    UpdateRecurringTaskSeriesCommand command =
        new UpdateRecurringTaskSeriesCommand(
            "Updated Series From Today",
            Optional.empty(),
            TaskPriority.P1,
            Optional.empty(),
            30,
            RecurrenceFrequency.DAILY,
            1,
            Optional.empty(),
            Optional.empty(),
            RecurrenceEndMode.NEVER,
            Optional.empty(),
            Optional.empty(),
            LocalDate.of(2026, 9, 5),
            "UTC");

    when(seriesRepository.findByIdAndUserId(seriesId, userId)).thenReturn(Optional.of(existing));
    when(seriesRepository.save(any(RecurringTaskSeries.class))).thenAnswer(i -> i.getArgument(0));

    RecurringTaskSeries newSeries =
        service.updateSeries(
            userId,
            seriesId,
            command,
            RecurrenceEditScope.THIS_AND_FUTURE,
            Optional.of(LocalDate.of(2026, 9, 5)));

    assertThat(newSeries.title()).isEqualTo("Updated Series From Today");
    verify(seriesRepository, times(2)).save(any(RecurringTaskSeries.class));
  }

  @Test
  @DisplayName("Updates single occurrence with THIS_OCCURRENCE scope")
  void updatesSeriesScopeThisOccurrence() {
    UUID seriesId = UUID.randomUUID();
    LocalDate occurrenceDate = LocalDate.of(2026, 9, 2);

    RecurringTaskSeries existing =
        new RecurringTaskSeries(
            seriesId,
            userId,
            "Daily Routine",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P3,
            Optional.empty(),
            15,
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

    Task occurrenceTask =
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            "Daily Routine",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P3,
            Optional.empty(),
            15,
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
            Optional.of(seriesId),
            Optional.of(occurrenceDate),
            0L);

    UpdateRecurringTaskSeriesCommand command =
        new UpdateRecurringTaskSeriesCommand(
            "Overridden Single Occurrence",
            Optional.empty(),
            TaskPriority.P1,
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
            "UTC");

    when(seriesRepository.findByIdAndUserId(seriesId, userId)).thenReturn(Optional.of(existing));
    when(taskRepository.findByRecurringSeriesId(seriesId)).thenReturn(List.of(occurrenceTask));
    when(taskRepository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));

    RecurringTaskSeries result =
        service.updateSeries(
            userId,
            seriesId,
            command,
            RecurrenceEditScope.THIS_OCCURRENCE,
            Optional.of(occurrenceDate));

    assertThat(result).isEqualTo(existing);
    verify(taskRepository).save(any(Task.class));
    verify(seriesRepository).saveException(any(RecurringTaskException.class));
  }

  @Test
  @DisplayName("Deletes a recurring task series")
  void deletesSeries() {
    UUID seriesId = UUID.randomUUID();
    RecurringTaskSeries series =
        new RecurringTaskSeries(
            seriesId,
            userId,
            "Series To Delete",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P3,
            Optional.empty(),
            15,
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

    when(seriesRepository.findByIdAndUserId(seriesId, userId)).thenReturn(Optional.of(series));
    when(taskRepository.findByRecurringSeriesId(seriesId)).thenReturn(List.of());

    service.deleteSeries(userId, seriesId);

    verify(seriesRepository).save(any(RecurringTaskSeries.class));
    verify(activityPort).record(any());
  }

  @Test
  @DisplayName("Skips an occurrence by recording an exception")
  void skipsOccurrence() {
    UUID seriesId = UUID.randomUUID();
    RecurringTaskSeries series =
        new RecurringTaskSeries(
            seriesId,
            userId,
            "Daily Sync",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P3,
            Optional.empty(),
            15,
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

    when(seriesRepository.findByIdAndUserId(seriesId, userId)).thenReturn(Optional.of(series));
    when(taskRepository.findByRecurringSeriesId(seriesId)).thenReturn(List.of());

    service.skipOccurrence(userId, seriesId, LocalDate.of(2026, 9, 2), Optional.of("On Vacation"));

    verify(seriesRepository).saveException(any(RecurringTaskException.class));
    verify(activityPort).record(any());
  }
}
