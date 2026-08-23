package tech.buildwithpartha.lifeos.task.infrastructure;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.task.domain.TaskDependencySummaryItem;
import tech.buildwithpartha.lifeos.task.domain.TaskDetailDependencies;
import tech.buildwithpartha.lifeos.task.domain.TaskDetailQueryRepository;

/** JPA read adapter using two fixed dependency projection queries per Task detail request. */
@Repository
class JpaTaskDetailQueryRepository implements TaskDetailQueryRepository {

  private static final String ITEM_TYPE =
      "tech.buildwithpartha.lifeos.task.domain.TaskDependencySummaryItem";

  private final EntityManager entityManager;

  JpaTaskDetailQueryRepository(EntityManager entityManager) {
    this.entityManager = entityManager;
  }

  @Override
  public TaskDetailDependencies findDependencies(UUID userId, UUID taskId) {
    List<TaskDependencySummaryItem> blockers =
        entityManager
            .createQuery(blockerQuery(), TaskDependencySummaryItem.class)
            .setParameter("userId", userId)
            .setParameter("taskId", taskId)
            .getResultList();
    List<TaskDependencySummaryItem> dependents =
        entityManager
            .createQuery(dependentQuery(), TaskDependencySummaryItem.class)
            .setParameter("userId", userId)
            .setParameter("taskId", taskId)
            .getResultList();

    return new TaskDetailDependencies(blockers, dependents);
  }

  private static String blockerQuery() {
    return "SELECT new "
        + ITEM_TYPE
        + "(t.id, t.title, t.status, t.priority, t.dueAt) "
        + "FROM TaskDependencyEntity d, TaskEntity t "
        + "WHERE d.id.blockedTaskId = :taskId "
        + "AND t.id = d.id.blockingTaskId "
        + "AND t.userId = :userId AND t.deletedAt IS NULL "
        + "ORDER BY t.createdAt ASC, t.id ASC";
  }

  private static String dependentQuery() {
    return "SELECT new "
        + ITEM_TYPE
        + "(t.id, t.title, t.status, t.priority, t.dueAt) "
        + "FROM TaskDependencyEntity d, TaskEntity t "
        + "WHERE d.id.blockingTaskId = :taskId "
        + "AND t.id = d.id.blockedTaskId "
        + "AND t.userId = :userId AND t.deletedAt IS NULL "
        + "ORDER BY t.createdAt ASC, t.id ASC";
  }
}
