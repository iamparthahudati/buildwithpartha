package tech.buildwithpartha.lifeos.task.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/** JPA entity mapping to {@code public.subtasks}. */
@Entity
@Table(name = "subtasks", schema = "public")
class SubtaskEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "task_id", nullable = false, updatable = false)
  private UUID taskId;

  @Column(name = "title", nullable = false)
  private String title;

  @Column(name = "completed", nullable = false)
  private boolean completed;

  @Column(name = "position", nullable = false)
  private int position;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected SubtaskEntity() {}

  SubtaskEntity(
      UUID id,
      UUID taskId,
      String title,
      boolean completed,
      int position,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.taskId = taskId;
    this.title = title;
    this.completed = completed;
    this.position = position;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  UUID getId() {
    return id;
  }

  UUID getTaskId() {
    return taskId;
  }

  String getTitle() {
    return title;
  }

  boolean isCompleted() {
    return completed;
  }

  int getPosition() {
    return position;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getUpdatedAt() {
    return updatedAt;
  }

  long getVersion() {
    return version;
  }
}
