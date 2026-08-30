package tech.buildwithpartha.lifeos.task.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.task.domain.TaskMilestoneAssignment;
import tech.buildwithpartha.lifeos.task.domain.TaskMilestoneRepository;

/** JPA-backed adapter for {@link TaskMilestoneRepository}. */
@Repository
class JpaTaskMilestoneRepository implements TaskMilestoneRepository {

  private final TaskMilestoneJpaRepository jpaRepository;

  JpaTaskMilestoneRepository(TaskMilestoneJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public TaskMilestoneAssignment save(TaskMilestoneAssignment assignment) {
    TaskMilestoneEntity entity =
        jpaRepository
            .findById(assignment.taskId())
            .map(
                existing -> {
                  existing.setMilestoneId(assignment.milestoneId());
                  existing.setUpdatedAt(assignment.updatedAt());
                  return existing;
                })
            .orElseGet(() -> TaskMilestoneEntity.fromDomain(assignment));
    return jpaRepository.save(entity).toDomain();
  }

  @Override
  public Optional<TaskMilestoneAssignment> findByTaskId(UUID taskId) {
    return jpaRepository.findById(taskId).map(TaskMilestoneEntity::toDomain);
  }

  @Override
  public void deleteByTaskId(UUID taskId) {
    jpaRepository.deleteById(taskId);
  }

  @Override
  public List<UUID> findTaskIdsByMilestoneId(UUID milestoneId) {
    return jpaRepository.findTaskIdsByMilestoneId(milestoneId);
  }
}
