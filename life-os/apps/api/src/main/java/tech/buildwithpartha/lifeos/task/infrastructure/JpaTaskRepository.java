package tech.buildwithpartha.lifeos.task.infrastructure;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.task.domain.Subtask;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskQuery;
import tech.buildwithpartha.lifeos.task.domain.TaskQueryResult;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;
import tech.buildwithpartha.lifeos.task.domain.TaskSummaryCounts;

/** Adapter implementing {@link TaskRepository} using Spring Data JPA. */
@Repository
public class JpaTaskRepository implements TaskRepository {

  private final TaskJpaRepository taskJpaRepository;
  private final SubtaskJpaRepository subtaskJpaRepository;
  private final EntityManager entityManager;

  public JpaTaskRepository(
      TaskJpaRepository taskJpaRepository,
      SubtaskJpaRepository subtaskJpaRepository,
      EntityManager entityManager) {
    this.taskJpaRepository = taskJpaRepository;
    this.subtaskJpaRepository = subtaskJpaRepository;
    this.entityManager = entityManager;
  }

  @Override
  public Task save(Task task) {
    TaskEntity entity = toEntity(task);
    TaskEntity saved = taskJpaRepository.saveAndFlush(entity);

    // Sync subtasks
    subtaskJpaRepository.deleteByTaskId(task.id());
    List<SubtaskEntity> subtaskEntities =
        task.subtasks().stream().map(JpaTaskRepository::toSubtaskEntity).toList();
    if (!subtaskEntities.isEmpty()) {
      subtaskJpaRepository.saveAllAndFlush(subtaskEntities);
    }

    return findById(saved.getId()).orElseGet(() -> toDomain(saved, task.subtasks()));
  }

  @Override
  public Optional<Task> findById(UUID id) {
    return taskJpaRepository.findById(id).map(this::loadTaskWithSubtasks);
  }

  @Override
  public Optional<Task> findByIdAndUserId(UUID id, UUID userId) {
    return taskJpaRepository.findByIdAndUserId(id, userId).map(this::loadTaskWithSubtasks);
  }

  @Override
  public List<Task> findByUserId(UUID userId) {
    return taskJpaRepository.findByUserId(userId).stream().map(this::loadTaskWithSubtasks).toList();
  }

  @Override
  public List<Task> findByProjectId(UUID projectId) {
    return taskJpaRepository.findByProjectId(projectId).stream()
        .map(this::loadTaskWithSubtasks)
        .toList();
  }

  @Override
  public List<Task> findByUserIdAndMitDate(UUID userId, LocalDate mitDate) {
    return taskJpaRepository.findByUserIdAndMitDate(userId, mitDate).stream()
        .map(this::loadTaskWithSubtasks)
        .toList();
  }

  @Override
  public void deleteById(UUID id) {
    subtaskJpaRepository.deleteByTaskId(id);
    taskJpaRepository.deleteById(id);
  }

  @Override
  public void clearMitDateForUserAndDate(UUID userId, LocalDate mitDate) {
    taskJpaRepository.clearMitDateForUserAndDate(userId, mitDate);
  }

  @Override
  public TaskQueryResult queryTasks(TaskQuery query) {
    CriteriaBuilder cb = entityManager.getCriteriaBuilder();
    CriteriaQuery<TaskEntity> cq = cb.createQuery(TaskEntity.class);
    Root<TaskEntity> root = cq.from(TaskEntity.class);

    List<Predicate> predicates = buildPredicates(cb, root, query, Instant.now());
    cq.where(predicates.toArray(new Predicate[0]));

    String sortBy = query.sortBy() != null ? query.sortBy() : "createdAt";
    String sortDir = query.sortDirection() != null ? query.sortDirection() : "DESC";

    Order primaryOrder =
        "asc".equalsIgnoreCase(sortDir) ? cb.asc(root.get(sortBy)) : cb.desc(root.get(sortBy));
    Order secondaryOrder = cb.asc(root.get("id"));
    cq.orderBy(primaryOrder, secondaryOrder);

    CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
    Root<TaskEntity> countRoot = countQuery.from(TaskEntity.class);
    List<Predicate> countPredicates = buildPredicates(cb, countRoot, query, Instant.now());
    countQuery.select(cb.count(countRoot)).where(countPredicates.toArray(new Predicate[0]));

    long totalItems = entityManager.createQuery(countQuery).getSingleResult();

    TypedQuery<TaskEntity> typedQuery = entityManager.createQuery(cq);
    typedQuery.setFirstResult(query.page() * query.size());
    typedQuery.setMaxResults(query.size());

    List<Task> tasks = typedQuery.getResultList().stream().map(this::loadTaskWithSubtasks).toList();

    return new TaskQueryResult(tasks, totalItems);
  }

  private List<Predicate> buildPredicates(
      CriteriaBuilder cb, Root<TaskEntity> root, TaskQuery query, Instant now) {
    List<Predicate> predicates = new ArrayList<>();

    predicates.add(cb.equal(root.get("userId"), query.userId()));
    predicates.add(cb.isNull(root.get("deletedAt")));

    if (query.query() != null && !query.query().isBlank()) {
      String searchPattern = "%" + query.query().trim().toLowerCase() + "%";
      Predicate titleLike = cb.like(cb.lower(root.get("title")), searchPattern);
      Predicate descLike = cb.like(cb.lower(root.get("description")), searchPattern);
      predicates.add(cb.or(titleLike, descLike));
    }

    if (query.projectId() != null) {
      predicates.add(cb.equal(root.get("projectId"), query.projectId()));
    }

    if (query.statuses() != null && !query.statuses().isEmpty()) {
      predicates.add(root.get("status").in(query.statuses()));
    }

    if (query.priorities() != null && !query.priorities().isEmpty()) {
      predicates.add(root.get("priority").in(query.priorities()));
    }

    if (query.mitDate() != null) {
      predicates.add(cb.equal(root.get("mitDate"), query.mitDate()));
    }

    if (Boolean.TRUE.equals(query.isMit())) {
      predicates.add(cb.isNotNull(root.get("mitDate")));
    } else if (Boolean.FALSE.equals(query.isMit())) {
      predicates.add(cb.isNull(root.get("mitDate")));
    }

    if (Boolean.TRUE.equals(query.archived())) {
      predicates.add(cb.isNotNull(root.get("archivedAt")));
    } else if (Boolean.FALSE.equals(query.archived()) || query.archived() == null) {
      predicates.add(cb.isNull(root.get("archivedAt")));
    }

    if (query.dueBefore() != null) {
      predicates.add(cb.lessThanOrEqualTo(root.get("dueAt"), query.dueBefore()));
    }

    if (query.dueAfter() != null) {
      predicates.add(cb.greaterThanOrEqualTo(root.get("dueAt"), query.dueAfter()));
    }

    if (query.labelIds() != null && !query.labelIds().isEmpty()) {
      jakarta.persistence.criteria.Join<TaskEntity, UUID> labelJoin = root.join("labelIds");
      predicates.add(labelJoin.in(query.labelIds()));
    }

    if (Boolean.TRUE.equals(query.overdue())) {
      predicates.add(cb.lessThan(root.get("dueAt"), now));
      predicates.add(cb.not(root.get("status").in(TaskStatus.DONE, TaskStatus.CANCELLED)));
    }

    return predicates;
  }

  @Override
  public TaskSummaryCounts getSummaryCounts(UUID userId, Instant now) {
    String sql =
        """
        SELECT
            COUNT(*),
            COUNT(CASE WHEN status = 'TO_DO' AND archived_at IS NULL THEN 1 END),
            COUNT(CASE WHEN status = 'IN_PROGRESS' AND archived_at IS NULL THEN 1 END),
            COUNT(CASE WHEN status = 'BLOCKED' AND archived_at IS NULL THEN 1 END),
            COUNT(CASE WHEN status = 'DONE' AND archived_at IS NULL THEN 1 END),
            COUNT(CASE WHEN status = 'CANCELLED' AND archived_at IS NULL THEN 1 END),
            COUNT(CASE WHEN due_at < :now AND status NOT IN ('DONE', 'CANCELLED')
                  AND archived_at IS NULL THEN 1 END),
            COUNT(CASE WHEN mit_date IS NOT NULL AND archived_at IS NULL THEN 1 END)
        FROM tasks
        WHERE user_id = :userId AND deleted_at IS NULL
        """;

    Query nativeQuery = entityManager.createNativeQuery(sql);
    nativeQuery.setParameter("userId", userId);
    nativeQuery.setParameter("now", now);
    Object[] result = (Object[]) nativeQuery.getSingleResult();

    long total = ((Number) result[0]).longValue();
    long toDo = ((Number) result[1]).longValue();
    long inProgress = ((Number) result[2]).longValue();
    long blocked = ((Number) result[3]).longValue();
    long done = ((Number) result[4]).longValue();
    long cancelled = ((Number) result[5]).longValue();
    long overdue = ((Number) result[6]).longValue();
    long mit = ((Number) result[7]).longValue();

    return new TaskSummaryCounts(total, toDo, inProgress, blocked, done, cancelled, overdue, mit);
  }

  private Task loadTaskWithSubtasks(TaskEntity entity) {
    List<Subtask> subtasks =
        subtaskJpaRepository.findByTaskIdOrderByPositionAsc(entity.getId()).stream()
            .map(JpaTaskRepository::toSubtaskDomain)
            .toList();
    return toDomain(entity, subtasks);
  }

  static Task toDomain(TaskEntity entity, List<Subtask> subtasks) {
    return new Task(
        entity.getId(),
        entity.getUserId(),
        Optional.ofNullable(entity.getProjectId()),
        entity.getTitle(),
        Optional.ofNullable(entity.getDescription()),
        entity.getStatus(),
        entity.getPriority(),
        Optional.ofNullable(entity.getDueAt()),
        entity.getEstimateMinutes(),
        entity.getSpentMinutes(),
        entity.getProgress(),
        Optional.ofNullable(entity.getMitDate()),
        entity.getPosition(),
        Optional.ofNullable(entity.getArchivedAt()),
        Optional.ofNullable(entity.getDeletedAt()),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        subtasks,
        entity.getLabelIds(),
        entity.getVersion());
  }

  static TaskEntity toEntity(Task domain) {
    return new TaskEntity(
        domain.id(),
        domain.userId(),
        domain.projectId().orElse(null),
        domain.title(),
        domain.description().orElse(null),
        domain.status(),
        domain.priority(),
        domain.dueAt().orElse(null),
        domain.estimateMinutes(),
        domain.spentMinutes(),
        domain.progress(),
        domain.mitDate().orElse(null),
        domain.position(),
        domain.archivedAt().orElse(null),
        domain.deletedAt().orElse(null),
        domain.createdAt(),
        domain.updatedAt(),
        domain.labelIds(),
        domain.version());
  }

  static Subtask toSubtaskDomain(SubtaskEntity entity) {
    return new Subtask(
        entity.getId(),
        entity.getTaskId(),
        entity.getTitle(),
        entity.isCompleted(),
        entity.getPosition(),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        entity.getVersion());
  }

  static SubtaskEntity toSubtaskEntity(Subtask domain) {
    return new SubtaskEntity(
        domain.id(),
        domain.taskId(),
        domain.title(),
        domain.completed(),
        domain.position(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }
}
