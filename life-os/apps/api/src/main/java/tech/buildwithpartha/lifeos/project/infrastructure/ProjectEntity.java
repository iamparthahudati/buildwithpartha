package tech.buildwithpartha.lifeos.project.infrastructure;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;

/** JPA entity mapping to {@code public.projects}. */
@Entity
@Table(name = "projects", schema = "public")
class ProjectEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "name", nullable = false)
  private String name;

  @Column(name = "description")
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private ProjectStatus status;

  @Enumerated(EnumType.STRING)
  @Column(name = "priority", nullable = false)
  private ProjectPriority priority;

  @Enumerated(EnumType.STRING)
  @Column(name = "health", nullable = false)
  private ProjectHealth health;

  @Column(name = "color")
  private String color;

  @Column(name = "icon")
  private String icon;

  @Column(name = "start_date")
  private LocalDate startDate;

  @Column(name = "deadline_date")
  private LocalDate deadlineDate;

  @Column(name = "estimate_minutes")
  private Integer estimateMinutes;

  @Column(name = "archived_at")
  private Instant archivedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(
      name = "project_labels",
      schema = "public",
      joinColumns = @JoinColumn(name = "project_id"))
  @Column(name = "label_id")
  private Set<UUID> labelIds = new HashSet<>();

  protected ProjectEntity() {}

  ProjectEntity(
      UUID id,
      UUID userId,
      String name,
      String description,
      ProjectStatus status,
      ProjectPriority priority,
      ProjectHealth health,
      String color,
      String icon,
      LocalDate startDate,
      LocalDate deadlineDate,
      Integer estimateMinutes,
      Instant archivedAt,
      Instant createdAt,
      Instant updatedAt,
      Set<UUID> labelIds,
      long version) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.description = description;
    this.status = status;
    this.priority = priority;
    this.health = health;
    this.color = color;
    this.icon = icon;
    this.startDate = startDate;
    this.deadlineDate = deadlineDate;
    this.estimateMinutes = estimateMinutes;
    this.archivedAt = archivedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.labelIds = labelIds != null ? labelIds : new HashSet<>();
    this.version = version;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  String getName() {
    return name;
  }

  String getDescription() {
    return description;
  }

  ProjectStatus getStatus() {
    return status;
  }

  ProjectPriority getPriority() {
    return priority;
  }

  ProjectHealth getHealth() {
    return health;
  }

  String getColor() {
    return color;
  }

  String getIcon() {
    return icon;
  }

  LocalDate getStartDate() {
    return startDate;
  }

  LocalDate getDeadlineDate() {
    return deadlineDate;
  }

  Integer getEstimateMinutes() {
    return estimateMinutes;
  }

  Instant getArchivedAt() {
    return archivedAt;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getUpdatedAt() {
    return updatedAt;
  }

  Set<UUID> getLabelIds() {
    return labelIds;
  }

  long getVersion() {
    return version;
  }
}
