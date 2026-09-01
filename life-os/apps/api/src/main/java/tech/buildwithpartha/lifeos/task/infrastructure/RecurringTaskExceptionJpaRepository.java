package tech.buildwithpartha.lifeos.task.infrastructure;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface RecurringTaskExceptionJpaRepository
    extends JpaRepository<RecurringTaskExceptionEntity, UUID> {

  Optional<RecurringTaskExceptionEntity> findBySeriesIdAndOccurrenceDate(
      UUID seriesId, LocalDate occurrenceDate);

  List<RecurringTaskExceptionEntity> findBySeriesId(UUID seriesId);

  List<RecurringTaskExceptionEntity> findByUserId(UUID userId);
}
