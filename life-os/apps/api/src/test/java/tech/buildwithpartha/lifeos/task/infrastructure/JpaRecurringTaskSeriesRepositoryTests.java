package tech.buildwithpartha.lifeos.task.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceEndMode;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceExceptionType;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceFrequency;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskException;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeries;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaRecurringTaskSeriesRepositoryTests {

  @Autowired private RecurringTaskSeriesJpaRepository seriesJpaRepository;
  @Autowired private RecurringTaskExceptionJpaRepository exceptionJpaRepository;

  private final UUID userId = UUID.randomUUID();
  private final Instant now = Instant.parse("2026-09-01T00:00:00Z");

  @Test
  @DisplayName("Persists and retrieves recurring task series definition")
  void persistsAndRetrievesSeries() {
    JpaRecurringTaskSeriesRepository repository =
        new JpaRecurringTaskSeriesRepository(seriesJpaRepository, exceptionJpaRepository);

    UUID seriesId = UUID.randomUUID();
    RecurringTaskSeries series =
        new RecurringTaskSeries(
            seriesId,
            userId,
            "Weekly Report",
            Optional.of("Generate weekly status report"),
            tech.buildwithpartha.lifeos.task.domain.TaskStatus.TO_DO,
            tech.buildwithpartha.lifeos.task.domain.TaskPriority.P1,
            Optional.empty(),
            45,
            RecurrenceFrequency.WEEKLY,
            1,
            Optional.of("FRIDAY"),
            Optional.empty(),
            RecurrenceEndMode.COUNT,
            Optional.empty(),
            Optional.of(12),
            LocalDate.of(2026, 9, 4),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            0L);

    RecurringTaskSeries saved = repository.save(series);
    assertThat(saved.id()).isEqualTo(seriesId);

    Optional<RecurringTaskSeries> retrieved = repository.findByIdAndUserId(seriesId, userId);
    assertThat(retrieved).isPresent();
    assertThat(retrieved.get().title()).isEqualTo("Weekly Report");
    assertThat(retrieved.get().frequency()).isEqualTo(RecurrenceFrequency.WEEKLY);
    assertThat(retrieved.get().endCount()).contains(12);
  }

  @Test
  @DisplayName("Persists and retrieves occurrence exception records")
  void persistsAndRetrievesExceptions() {
    JpaRecurringTaskSeriesRepository repository =
        new JpaRecurringTaskSeriesRepository(seriesJpaRepository, exceptionJpaRepository);

    UUID seriesId = UUID.randomUUID();
    RecurringTaskSeries series =
        new RecurringTaskSeries(
            seriesId,
            userId,
            "Daily Routine",
            Optional.empty(),
            tech.buildwithpartha.lifeos.task.domain.TaskStatus.TO_DO,
            tech.buildwithpartha.lifeos.task.domain.TaskPriority.P2,
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
            "UTC",
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            0L);
    repository.save(series);

    UUID exceptionId = UUID.randomUUID();
    LocalDate occurrenceDate = LocalDate.of(2026, 9, 10);
    RecurringTaskException exception =
        new RecurringTaskException(
            exceptionId,
            seriesId,
            userId,
            occurrenceDate,
            RecurrenceExceptionType.SKIPPED,
            Optional.empty(),
            Optional.empty(),
            Optional.of("Out of office"),
            now);

    repository.saveException(exception);

    Optional<RecurringTaskException> retrieved =
        repository.findExceptionBySeriesIdAndDate(seriesId, occurrenceDate);
    assertThat(retrieved).isPresent();
    assertThat(retrieved.get().exceptionType()).isEqualTo(RecurrenceExceptionType.SKIPPED);
    assertThat(retrieved.get().reason()).contains("Out of office");

    List<RecurringTaskException> seriesExceptions = repository.findExceptionsBySeriesId(seriesId);
    assertThat(seriesExceptions).hasSize(1);
  }
}
