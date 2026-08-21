package tech.buildwithpartha.lifeos.task.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.task.domain.TaskDependency;
import tech.buildwithpartha.lifeos.task.domain.TaskDependencyRepository;

@Repository
class JpaTaskDependencyRepository implements TaskDependencyRepository {

  private final TaskDependencyJpaRepository jpaRepository;

  public JpaTaskDependencyRepository(TaskDependencyJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public TaskDependency save(TaskDependency dependency) {
    TaskDependencyEntity entity = TaskDependencyEntity.fromDomain(dependency);
    TaskDependencyEntity saved = jpaRepository.save(entity);
    return saved.toDomain();
  }

  @Override
  public void delete(UUID blockingTaskId, UUID blockedTaskId) {
    TaskDependencyId id = new TaskDependencyId(blockingTaskId, blockedTaskId);
    jpaRepository.deleteById(id);
  }

  @Override
  public boolean exists(UUID blockingTaskId, UUID blockedTaskId) {
    TaskDependencyId id = new TaskDependencyId(blockingTaskId, blockedTaskId);
    return jpaRepository.existsById(id);
  }

  @Override
  public Optional<TaskDependency> find(UUID blockingTaskId, UUID blockedTaskId) {
    TaskDependencyId id = new TaskDependencyId(blockingTaskId, blockedTaskId);
    return jpaRepository.findById(id).map(TaskDependencyEntity::toDomain);
  }

  @Override
  public List<TaskDependency> findBlockersForTask(UUID blockedTaskId) {
    return jpaRepository.findByIdBlockedTaskId(blockedTaskId).stream()
        .map(TaskDependencyEntity::toDomain)
        .toList();
  }

  @Override
  public List<TaskDependency> findDependentsForTask(UUID blockingTaskId) {
    return jpaRepository.findByIdBlockingTaskId(blockingTaskId).stream()
        .map(TaskDependencyEntity::toDomain)
        .toList();
  }

  @Override
  public List<TaskDependency> findAllForUser(UUID userId) {
    return jpaRepository.findAllByUserId(userId).stream()
        .map(TaskDependencyEntity::toDomain)
        .toList();
  }
}
