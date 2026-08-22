package tech.buildwithpartha.lifeos.project.infrastructure;

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
import tech.buildwithpartha.lifeos.project.domain.MilestoneStatus;

/** JPA entity mapping to {@code public.milestones}. */
@Entity
@Table(name = "milestones", schema = "public")
class MilestoneEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "project_id", nullable = false, updatable = false)
  private UUID projectId;

  @Column(name = "title", nullable = false)
  private String title;

  @Column(name = "date")
  private LocalDate date;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private MilestoneStatus status;

  @Column(name = "ordering", nullable = false)
  private int ordering;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected MilestoneEntity() {}

  MilestoneEntity(
      UUID id,
      UUID projectId,
      String title,
      LocalDate date,
      MilestoneStatus status,
      int ordering,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.projectId = projectId;
    this.title = title;
    this.date = date;
    this.status = status;
    this.ordering = ordering;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  UUID getId() {
    return id;
  }

  UUID getProjectId() {
    return projectId;
  }

  String getTitle() {
    return title;
  }

  LocalDate getDate() {
    return date;
  }

  MilestoneStatus getStatus() {
    return status;
  }

  int getOrdering() {
    return ordering;
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
