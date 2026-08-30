package tech.buildwithpartha.lifeos.task.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.TaskMilestoneAssignment;

/** JPA entity mapping to {@code public.task_milestones}. */
@Entity
@Table(name = "task_milestones", schema = "public")
class TaskMilestoneEntity {

  @Id
  @Column(name = "task_id", nullable = false, updatable = false)
  private UUID taskId;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "milestone_id", nullable = false)
  private UUID milestoneId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected TaskMilestoneEntity() {}

  TaskMilestoneEntity(
      UUID taskId,
      UUID userId,
      UUID milestoneId,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.taskId = taskId;
    this.userId = userId;
    this.milestoneId = milestoneId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  TaskMilestoneAssignment toDomain() {
    return new TaskMilestoneAssignment(taskId, userId, milestoneId, createdAt, updatedAt, version);
  }

  static TaskMilestoneEntity fromDomain(TaskMilestoneAssignment domain) {
    return new TaskMilestoneEntity(
        domain.taskId(),
        domain.userId(),
        domain.milestoneId(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }

  void setMilestoneId(UUID milestoneId) {
    this.milestoneId = milestoneId;
  }

  void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
