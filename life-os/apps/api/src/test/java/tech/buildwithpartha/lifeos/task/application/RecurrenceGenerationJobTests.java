package tech.buildwithpartha.lifeos.task.application;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceEndMode;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceFrequency;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeries;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeriesRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

class RecurrenceGenerationJobTests {

  private RecurringTaskSeriesRepository seriesRepository;
  private RecurrenceGenerationService generationService;
  private RecurrenceGenerationJob job;

  @BeforeEach
  void setUp() {
    seriesRepository = mock(RecurringTaskSeriesRepository.class);
    generationService = mock(RecurrenceGenerationService.class);
    job = new RecurrenceGenerationJob(seriesRepository, generationService);
  }

  @Test
  @DisplayName("Runs recurrence generation job across series skipping archived and handling errors")
  void runsRecurrenceGenerationJob() {
    Instant now = Instant.now();
    UUID userId = UUID.randomUUID();

    RecurringTaskSeries activeSeries =
        new RecurringTaskSeries(
            UUID.randomUUID(),
            userId,
            "Active Series",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P2,
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

    RecurringTaskSeries archivedSeries =
        new RecurringTaskSeries(
            UUID.randomUUID(),
            userId,
            "Archived Series",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P2,
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
            Optional.of(now),
            Optional.empty(),
            now,
            now,
            0L);

    when(seriesRepository.findByUserId(null)).thenReturn(List.of(activeSeries, archivedSeries));
    when(generationService.generateOccurrencesForSeries(any(), any())).thenReturn(2);

    job.runRecurrenceGeneration();

    verify(generationService).generateOccurrencesForSeries(any(), any());
  }
}
