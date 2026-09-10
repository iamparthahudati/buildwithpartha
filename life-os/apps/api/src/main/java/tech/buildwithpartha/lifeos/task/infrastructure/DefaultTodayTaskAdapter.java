package tech.buildwithpartha.lifeos.task.infrastructure;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

/**
 * Task domain adapter implementing {@link TodayTaskPort} for Today dashboard queries (LOS-1415).
 */
@Component
public class DefaultTodayTaskAdapter implements TodayTaskPort {

  private final TaskJpaRepository taskJpaRepository;
  private final EntityManager entityManager;

  public DefaultTodayTaskAdapter(TaskJpaRepository taskJpaRepository, EntityManager entityManager) {
    this.taskJpaRepository =
        Objects.requireNonNull(taskJpaRepository, "taskJpaRepository must not be null");
    this.entityManager = Objects.requireNonNull(entityManager, "entityManager must not be null");
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<TodayTaskRecord> getMitTask(UUID userId, LocalDate localDate, ZoneId zoneId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(localDate, "localDate must not be null");
    Objects.requireNonNull(zoneId, "zoneId must not be null");

    return taskJpaRepository.findByUserIdAndMitDate(userId, localDate).stream()
        .filter(t -> t.getDeletedAt() == null && t.getArchivedAt() == null)
        .sorted(Comparator.comparingInt(TaskEntity::getPosition).thenComparing(TaskEntity::getId))
        .findFirst()
        .map(entity -> toRecord(entity, zoneId, Instant.now()));
  }

  @Override
  @Transactional(readOnly = true)
  public List<TodayTaskRecord> getTasksDueToday(
      UUID userId, LocalDate localDate, ZoneId zoneId, Instant now, int limit) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(localDate, "localDate must not be null");
    Objects.requireNonNull(zoneId, "zoneId must not be null");
    Objects.requireNonNull(now, "now must not be null");

    Instant rangeStart = localDate.atStartOfDay(zoneId).toInstant();
    Instant rangeEnd = localDate.plusDays(1).atStartOfDay(zoneId).toInstant();

    Comparator<TaskEntity> comparator =
        Comparator.<TaskEntity>comparingInt(t -> t.getStatus() == TaskStatus.DONE ? 1 : 0)
            .thenComparingInt(TaskEntity::getPosition)
            .thenComparing(TaskEntity::getDueAt, Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(TaskEntity::getPriority)
            .thenComparing(TaskEntity::getId);

    return taskJpaRepository.findByUserId(userId).stream()
        .filter(t -> t.getDeletedAt() == null && t.getArchivedAt() == null)
        .filter(
            t ->
                (t.getDueAt() != null
                        && !t.getDueAt().isBefore(rangeStart)
                        && t.getDueAt().isBefore(rangeEnd))
                    || (t.getMitDate() != null && t.getMitDate().equals(localDate)))
        .sorted(comparator)
        .limit(limit > 0 ? limit : 20)
        .map(entity -> toRecord(entity, zoneId, now))
        .toList();
  }

  @Override
  @Transactional(readOnly = true)
  public TodayOverdueRecord getOverdueTasks(UUID userId, Instant now, ZoneId zoneId, int limit) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(now, "now must not be null");
    Objects.requireNonNull(zoneId, "zoneId must not be null");

    List<TaskEntity> overdueEntities =
        taskJpaRepository.findByUserId(userId).stream()
            .filter(t -> t.getDeletedAt() == null && t.getArchivedAt() == null)
            .filter(
                t ->
                    t.getStatus() != TaskStatus.DONE
                        && t.getStatus() != TaskStatus.CANCELLED
                        && t.getDueAt() != null
                        && t.getDueAt().isBefore(now))
            .sorted(
                Comparator.comparing(TaskEntity::getDueAt)
                    .thenComparing(TaskEntity::getPriority)
                    .thenComparing(TaskEntity::getId))
            .toList();

    int totalCount = overdueEntities.size();
    List<TodayTaskRecord> topTasks =
        overdueEntities.stream()
            .limit(limit > 0 ? limit : 5)
            .map(entity -> toRecord(entity, zoneId, now))
            .toList();

    return new TodayOverdueRecord(totalCount, topTasks);
  }

  @Override
  @Transactional(readOnly = true)
  @SuppressWarnings("unchecked")
  public Map<UUID, ProjectTaskCountRecord> getProjectTaskCounts(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");

    String sql =
        """
        SELECT
            project_id,
            COUNT(*),
            COUNT(CASE WHEN status = 'DONE' THEN 1 END)
        FROM tasks
        WHERE user_id = :userId
          AND project_id IS NOT NULL
          AND deleted_at IS NULL
          AND archived_at IS NULL
        GROUP BY project_id
        """;

    Query query = entityManager.createNativeQuery(sql);
    query.setParameter("userId", userId);
    List<Object[]> rows = query.getResultList();

    Map<UUID, ProjectTaskCountRecord> counts = new HashMap<>();
    for (Object[] row : rows) {
      UUID projectId = row[0] instanceof UUID u ? u : UUID.fromString(row[0].toString());
      int total = ((Number) row[1]).intValue();
      int completed = ((Number) row[2]).intValue();
      counts.put(projectId, new ProjectTaskCountRecord(completed, total));
    }
    return counts;
  }

  @Override
  @Transactional(readOnly = true)
  public int getCompletedTasksCountToday(UUID userId, Instant startOfDay, Instant endOfDay) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(startOfDay, "startOfDay must not be null");
    Objects.requireNonNull(endOfDay, "endOfDay must not be null");

    String sql =
        """
        SELECT COUNT(*)
        FROM tasks
        WHERE user_id = :userId
          AND status = 'DONE'
          AND deleted_at IS NULL
          AND updated_at >= :startOfDay
          AND updated_at < :endOfDay
        """;

    Query query = entityManager.createNativeQuery(sql);
    query.setParameter("userId", userId);
    query.setParameter("startOfDay", startOfDay);
    query.setParameter("endOfDay", endOfDay);

    Number result = (Number) query.getSingleResult();
    return result != null ? result.intValue() : 0;
  }

  private static TodayTaskRecord toRecord(TaskEntity entity, ZoneId zoneId, Instant now) {
    boolean completed = entity.getStatus() == TaskStatus.DONE;
    boolean isOverdue =
        !completed
            && entity.getStatus() != TaskStatus.CANCELLED
            && entity.getDueAt() != null
            && entity.getDueAt().isBefore(now);
    Optional<LocalDate> dueDate =
        Optional.ofNullable(entity.getDueAt()).map(due -> due.atZone(zoneId).toLocalDate());

    return new TodayTaskRecord(
        entity.getId(),
        entity.getTitle(),
        Optional.ofNullable(entity.getProjectId()),
        entity.getPriority().name(),
        dueDate,
        completed,
        isOverdue);
  }
}
