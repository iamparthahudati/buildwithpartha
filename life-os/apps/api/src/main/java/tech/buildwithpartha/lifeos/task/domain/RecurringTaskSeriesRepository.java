package tech.buildwithpartha.lifeos.task.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Domain repository interface for {@link RecurringTaskSeries} aggregates and exceptions. */
public interface RecurringTaskSeriesRepository {

  RecurringTaskSeries save(RecurringTaskSeries series);

  Optional<RecurringTaskSeries> findById(UUID id);

  Optional<RecurringTaskSeries> findByIdAndUserId(UUID id, UUID userId);

  List<RecurringTaskSeries> findByUserId(UUID userId);

  List<RecurringTaskSeries> findActiveByUserId(UUID userId);

  void deleteById(UUID id);

  RecurringTaskException saveException(RecurringTaskException exception);

  Optional<RecurringTaskException> findExceptionBySeriesIdAndDate(
      UUID seriesId, LocalDate occurrenceDate);

  List<RecurringTaskException> findExceptionsBySeriesId(UUID seriesId);

  List<RecurringTaskException> findExceptionsByUserId(UUID userId);

  void deleteExceptionById(UUID exceptionId);
}
