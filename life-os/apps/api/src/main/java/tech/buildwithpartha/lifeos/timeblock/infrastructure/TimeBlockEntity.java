package tech.buildwithpartha.lifeos.timeblock.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** JPA entity mapping to {@code public.time_blocks}. */
@Entity
@Table(name = "time_blocks", schema = "public")
class TimeBlockEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "project_id")
  private UUID projectId;

  @Column(name = "task_id")
  private UUID taskId;

  @Column(name = "title", nullable = false)
  private String title;

  @Column(name = "category", nullable = false)
  private String category;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private TimeBlockStatus status;

  @Column(name = "start_at", nullable = false)
  private Instant startAt;

  @Column(name = "end_at", nullable = false)
  private Instant endAt;

  @Column(name = "source_time_zone", nullable = false)
  private String sourceTimeZone;

  @Column(name = "notes")
  private String notes;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected TimeBlockEntity() {}

  TimeBlockEntity(
      UUID id,
      UUID userId,
      UUID projectId,
      UUID taskId,
      String title,
      String category,
      TimeBlockStatus status,
      Instant startAt,
      Instant endAt,
      String sourceTimeZone,
      String notes,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.projectId = projectId;
    this.taskId = taskId;
    this.title = title;
    this.category = category;
    this.status = status;
    this.startAt = startAt;
    this.endAt = endAt;
    this.sourceTimeZone = sourceTimeZone;
    this.notes = notes;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  static TimeBlockEntity fromDomain(TimeBlock domain) {
    return new TimeBlockEntity(
        domain.id(),
        domain.userId(),
        domain.projectId().orElse(null),
        domain.taskId().orElse(null),
        domain.title(),
        domain.category(),
        domain.status(),
        domain.startAt(),
        domain.endAt(),
        domain.sourceTimeZone(),
        domain.notes().orElse(null),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }

  TimeBlock toDomain() {
    return new TimeBlock(
        id,
        userId,
        Optional.ofNullable(projectId),
        Optional.ofNullable(taskId),
        title,
        category,
        status,
        startAt,
        endAt,
        sourceTimeZone,
        Optional.ofNullable(notes),
        createdAt,
        updatedAt,
        version);
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

  UUID getTaskId() {
    return taskId;
  }

  String getTitle() {
    return title;
  }

  String getCategory() {
    return category;
  }

  TimeBlockStatus getStatus() {
    return status;
  }

  Instant getStartAt() {
    return startAt;
  }

  Instant getEndAt() {
    return endAt;
  }

  String getSourceTimeZone() {
    return sourceTimeZone;
  }

  String getNotes() {
    return notes;
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
