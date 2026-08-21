package tech.buildwithpartha.lifeos.task.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import tech.buildwithpartha.lifeos.task.domain.TaskDependency;

/** JPA entity mapping to {@code public.task_dependencies}. */
@Entity
@Table(name = "task_dependencies", schema = "public")
class TaskDependencyEntity {

  @EmbeddedId private TaskDependencyId id;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  public TaskDependencyEntity() {}

  public TaskDependencyEntity(TaskDependencyId id, Instant createdAt) {
    this.id = id;
    this.createdAt = createdAt;
  }

  public TaskDependencyId getId() {
    return id;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public TaskDependency toDomain() {
    return new TaskDependency(id.getBlockingTaskId(), id.getBlockedTaskId(), createdAt);
  }

  public static TaskDependencyEntity fromDomain(TaskDependency domain) {
    return new TaskDependencyEntity(
        new TaskDependencyId(domain.blockingTaskId(), domain.blockedTaskId()), domain.createdAt());
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    TaskDependencyEntity that = (TaskDependencyEntity) o;
    return Objects.equals(id, that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hash(id);
  }
}
