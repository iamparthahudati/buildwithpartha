package tech.buildwithpartha.lifeos.task.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

/** JPA entity mapping to {@code public.tasks}. */
@Entity
@Table(name = "tasks", schema = "public")
class TaskEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "project_id")
  private UUID projectId;

  @Column(name = "title", nullable = false)
  private String title;

  @Column(name = "description")
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private TaskStatus status;

  @Enumerated(EnumType.STRING)
  @Column(name = "priority", nullable = false)
  private TaskPriority priority;

  @Column(name = "due_at")
  private Instant dueAt;

  @Column(name = "estimate_minutes", nullable = false)
  private int estimateMinutes;

  @Column(name = "spent_minutes", nullable = false)
  private int spentMinutes;

  @Column(name = "progress", nullable = false)
  private int progress;

  @Column(name = "mit_date")
  private LocalDate mitDate;

  @Column(name = "position", nullable = false)
  private int position;

  @Column(name = "archived_at")
  private Instant archivedAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected TaskEntity() {}

  TaskEntity(
      UUID id,
      UUID userId,
      UUID projectId,
      String title,
      String description,
      TaskStatus status,
      TaskPriority priority,
      Instant dueAt,
      int estimateMinutes,
      int spentMinutes,
      int progress,
      LocalDate mitDate,
      int position,
      Instant archivedAt,
      Instant deletedAt,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.projectId = projectId;
    this.title = title;
    this.description = description;
    this.status = status;
    this.priority = priority;
    this.dueAt = dueAt;
    this.estimateMinutes = estimateMinutes;
    this.spentMinutes = spentMinutes;
    this.progress = progress;
    this.mitDate = mitDate;
    this.position = position;
    this.archivedAt = archivedAt;
    this.deletedAt = deletedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  UUID getProjectId() {
    return projectId;
  }

  String getTitle() {
    return title;
  }

  String getDescription() {
    return description;
  }

  TaskStatus getStatus() {
    return status;
  }

  TaskPriority getPriority() {
    return priority;
  }

  Instant getDueAt() {
    return dueAt;
  }

  int getEstimateMinutes() {
    return estimateMinutes;
  }

  int getSpentMinutes() {
    return spentMinutes;
  }

  int getProgress() {
    return progress;
  }

  LocalDate getMitDate() {
    return mitDate;
  }

  int getPosition() {
    return position;
  }

  Instant getArchivedAt() {
    return archivedAt;
  }

  Instant getDeletedAt() {
    return deletedAt;
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
