package tech.buildwithpartha.lifeos.task.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/** Composite primary key for {@link TaskDependencyEntity}. */
@Embeddable
class TaskDependencyId implements Serializable {

  @Column(name = "blocking_task_id", nullable = false)
  private UUID blockingTaskId;

  @Column(name = "blocked_task_id", nullable = false)
  private UUID blockedTaskId;

  public TaskDependencyId() {}

  public TaskDependencyId(UUID blockingTaskId, UUID blockedTaskId) {
    this.blockingTaskId = blockingTaskId;
    this.blockedTaskId = blockedTaskId;
  }

  public UUID getBlockingTaskId() {
    return blockingTaskId;
  }

  public UUID getBlockedTaskId() {
    return blockedTaskId;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    TaskDependencyId that = (TaskDependencyId) o;
    return Objects.equals(blockingTaskId, that.blockingTaskId)
        && Objects.equals(blockedTaskId, that.blockedTaskId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(blockingTaskId, blockedTaskId);
  }
}
