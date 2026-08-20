package tech.buildwithpartha.lifeos.task.infrastructure;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.task.domain.Subtask;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

/** Adapter implementing {@link TaskRepository} using Spring Data JPA. */
@Repository
public class JpaTaskRepository implements TaskRepository {

  private final TaskJpaRepository taskJpaRepository;
  private final SubtaskJpaRepository subtaskJpaRepository;

  public JpaTaskRepository(
      TaskJpaRepository taskJpaRepository, SubtaskJpaRepository subtaskJpaRepository) {
    this.taskJpaRepository = taskJpaRepository;
    this.subtaskJpaRepository = subtaskJpaRepository;
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
