package tech.buildwithpartha.lifeos.comment.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.comment.domain.CommentFormat;

/** JPA row for {@code public.comments}. Exactly one parent foreign key is non-null. */
@Entity
@Table(name = "comments", schema = "public")
class CommentEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "task_id", updatable = false)
  private UUID taskId;

  @Column(name = "project_id", updatable = false)
  private UUID projectId;

  @Column(name = "body", nullable = false, columnDefinition = "TEXT")
  private String body;

  @Enumerated(EnumType.STRING)
  @Column(name = "format", nullable = false)
  private CommentFormat format;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "edited_at")
  private Instant editedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected CommentEntity() {}

  CommentEntity(
      UUID id,
      UUID userId,
      UUID taskId,
      UUID projectId,
      String body,
      CommentFormat format,
      Instant createdAt,
      Instant updatedAt,
      Instant editedAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.taskId = taskId;
    this.projectId = projectId;
    this.body = body;
    this.format = format;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.editedAt = editedAt;
    this.version = version;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  UUID getTaskId() {
    return taskId;
  }

  UUID getProjectId() {
    return projectId;
  }

  String getBody() {
    return body;
  }

  CommentFormat getFormat() {
    return format;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getUpdatedAt() {
    return updatedAt;
  }

  Instant getEditedAt() {
    return editedAt;
  }

  long getVersion() {
    return version;
  }
}
