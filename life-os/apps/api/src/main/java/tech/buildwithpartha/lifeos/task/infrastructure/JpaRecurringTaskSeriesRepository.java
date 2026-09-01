package tech.buildwithpartha.lifeos.task.infrastructure;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskException;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeries;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeriesRepository;

/** Adapter implementing {@link RecurringTaskSeriesRepository} using Spring Data JPA. */
@Repository
public class JpaRecurringTaskSeriesRepository implements RecurringTaskSeriesRepository {

  private final RecurringTaskSeriesJpaRepository seriesJpaRepository;
  private final RecurringTaskExceptionJpaRepository exceptionJpaRepository;

  public JpaRecurringTaskSeriesRepository(
      RecurringTaskSeriesJpaRepository seriesJpaRepository,
      RecurringTaskExceptionJpaRepository exceptionJpaRepository) {
    this.seriesJpaRepository = seriesJpaRepository;
    this.exceptionJpaRepository = exceptionJpaRepository;
  }

  @Override
  public RecurringTaskSeries save(RecurringTaskSeries series) {
    RecurringTaskSeriesEntity entity = toEntity(series);
    RecurringTaskSeriesEntity saved = seriesJpaRepository.saveAndFlush(entity);
    return toDomain(saved);
  }

  @Override
  public Optional<RecurringTaskSeries> findById(UUID id) {
    return seriesJpaRepository.findById(id).map(JpaRecurringTaskSeriesRepository::toDomain);
  }

  @Override
  public Optional<RecurringTaskSeries> findByIdAndUserId(UUID id, UUID userId) {
    return seriesJpaRepository
        .findByIdAndUserId(id, userId)
        .map(JpaRecurringTaskSeriesRepository::toDomain);
  }

  @Override
  public List<RecurringTaskSeries> findByUserId(UUID userId) {
    return seriesJpaRepository.findByUserId(userId).stream()
        .map(JpaRecurringTaskSeriesRepository::toDomain)
        .toList();
  }

  @Override
  public List<RecurringTaskSeries> findActiveByUserId(UUID userId) {
    return seriesJpaRepository.findByUserIdAndDeletedAtIsNull(userId).stream()
        .map(JpaRecurringTaskSeriesRepository::toDomain)
        .toList();
  }

  @Override
  public void deleteById(UUID id) {
    seriesJpaRepository.deleteById(id);
  }

  @Override
  public RecurringTaskException saveException(RecurringTaskException exception) {
    RecurringTaskExceptionEntity entity = toEntity(exception);
    RecurringTaskExceptionEntity saved = exceptionJpaRepository.saveAndFlush(entity);
    return toDomain(saved);
  }

  @Override
  public Optional<RecurringTaskException> findExceptionBySeriesIdAndDate(
      UUID seriesId, LocalDate occurrenceDate) {
    return exceptionJpaRepository
        .findBySeriesIdAndOccurrenceDate(seriesId, occurrenceDate)
        .map(JpaRecurringTaskSeriesRepository::toDomain);
  }

  @Override
  public List<RecurringTaskException> findExceptionsBySeriesId(UUID seriesId) {
    return exceptionJpaRepository.findBySeriesId(seriesId).stream()
        .map(JpaRecurringTaskSeriesRepository::toDomain)
        .toList();
  }

  @Override
  public List<RecurringTaskException> findExceptionsByUserId(UUID userId) {
    return exceptionJpaRepository.findByUserId(userId).stream()
        .map(JpaRecurringTaskSeriesRepository::toDomain)
        .toList();
  }

  @Override
  public void deleteExceptionById(UUID exceptionId) {
    exceptionJpaRepository.deleteById(exceptionId);
  }

  static RecurringTaskSeries toDomain(RecurringTaskSeriesEntity entity) {
    return new RecurringTaskSeries(
        entity.getId(),
        entity.getUserId(),
        entity.getTitle(),
        Optional.ofNullable(entity.getDescription()),
        entity.getStatus(),
        entity.getPriority(),
        Optional.ofNullable(entity.getProjectId()),
        entity.getEstimateMinutes(),
        entity.getFrequency(),
        entity.getIntervalValue(),
        Optional.ofNullable(entity.getDaysOfWeek()),
        Optional.ofNullable(entity.getDayOfMonth()),
        entity.getEndMode(),
        Optional.ofNullable(entity.getEndDate()),
        Optional.ofNullable(entity.getEndCount()),
        entity.getStartDate(),
        entity.getTimeZone(),
        Optional.ofNullable(entity.getArchivedAt()),
        Optional.ofNullable(entity.getDeletedAt()),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        entity.getVersion());
  }

  static RecurringTaskSeriesEntity toEntity(RecurringTaskSeries domain) {
    return new RecurringTaskSeriesEntity(
        domain.id(),
        domain.userId(),
        domain.title(),
        domain.description().orElse(null),
        domain.status(),
        domain.priority(),
        domain.projectId().orElse(null),
        domain.estimateMinutes(),
        domain.frequency(),
        domain.intervalValue(),
        domain.daysOfWeek().orElse(null),
        domain.dayOfMonth().orElse(null),
        domain.endMode(),
        domain.endDate().orElse(null),
        domain.endCount().orElse(null),
        domain.startDate(),
        domain.timeZone(),
        domain.archivedAt().orElse(null),
        domain.deletedAt().orElse(null),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }

  static RecurringTaskException toDomain(RecurringTaskExceptionEntity entity) {
    return new RecurringTaskException(
        entity.getId(),
        entity.getSeriesId(),
        entity.getUserId(),
        entity.getOccurrenceDate(),
        entity.getExceptionType(),
        Optional.ofNullable(entity.getRescheduledDate()),
        Optional.ofNullable(entity.getOverrideTaskId()),
        Optional.ofNullable(entity.getReason()),
        entity.getCreatedAt());
  }

  static RecurringTaskExceptionEntity toEntity(RecurringTaskException domain) {
    return new RecurringTaskExceptionEntity(
        domain.id(),
        domain.seriesId(),
        domain.userId(),
        domain.occurrenceDate(),
        domain.exceptionType(),
        domain.rescheduledDate().orElse(null),
        domain.overrideTaskId().orElse(null),
        domain.reason().orElse(null),
        domain.createdAt());
  }
}
