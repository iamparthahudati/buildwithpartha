package tech.buildwithpartha.lifeos.task.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface TaskDependencyJpaRepository
    extends JpaRepository<TaskDependencyEntity, TaskDependencyId> {

  List<TaskDependencyEntity> findByIdBlockedTaskId(UUID blockedTaskId);

  List<TaskDependencyEntity> findByIdBlockingTaskId(UUID blockingTaskId);

  @Query(
      "SELECT d FROM TaskDependencyEntity d WHERE d.id.blockingTaskId IN ("
          + " SELECT t.id FROM TaskEntity t WHERE t.userId = :userId AND t.deletedAt IS NULL"
          + ")")
  List<TaskDependencyEntity> findAllByUserId(@Param("userId") UUID userId);
}
