package tech.buildwithpartha.lifeos.goal.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;

/** JPA entity mapping to {@code public.goals}. */
@Entity
@Table(name = "goals", schema = "public")
class GoalEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "title", nullable = false)
  private String title;

  @Column(name = "description")
  private String description;

  @Column(name = "category", nullable = false)
  private String category;

  @Enumerated(EnumType.STRING)
  @Column(name = "progress_type", nullable = false)
  private GoalProgressType progressType;

  @Column(name = "target_value")
  private BigDecimal targetValue;

  @Column(name = "current_value", nullable = false)
  private BigDecimal currentValue;

  @Column(name = "unit")
  private String unit;

  @Column(name = "target_date")
  private LocalDate targetDate;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private GoalStatus status;

  @Enumerated(EnumType.STRING)
  @Column(name = "check_in_cadence", nullable = false)
  private CheckInCadence checkInCadence;

  @Column(name = "archived", nullable = false)
  private boolean archived;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected GoalEntity() {}

  GoalEntity(
      UUID id,
      UUID userId,
      String title,
      String description,
      String category,
      GoalProgressType progressType,
      BigDecimal targetValue,
      BigDecimal currentValue,
      String unit,
      LocalDate targetDate,
      GoalStatus status,
      CheckInCadence checkInCadence,
      boolean archived,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.title = title;
    this.description = description;
    this.category = category;
    this.progressType = progressType;
    this.targetValue = targetValue;
    this.currentValue = currentValue;
    this.unit = unit;
    this.targetDate = targetDate;
    this.status = status;
    this.checkInCadence = checkInCadence;
    this.archived = archived;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  static GoalEntity fromDomain(Goal domain) {
    return new GoalEntity(
        domain.id(),
        domain.userId(),
        domain.title(),
        domain.description().orElse(null),
        domain.category(),
        domain.progressType(),
        domain.targetValue().orElse(null),
        domain.currentValue(),
        domain.unit().orElse(null),
        domain.targetDate().orElse(null),
        domain.status(),
        domain.checkInCadence(),
        domain.archived(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }

  Goal toDomain() {
    return new Goal(
        id,
        userId,
        title,
        Optional.ofNullable(description),
        category,
        progressType,
        Optional.ofNullable(targetValue),
        currentValue,
        Optional.ofNullable(unit),
        Optional.ofNullable(targetDate),
        status,
        checkInCadence,
        archived,
        createdAt,
        updatedAt,
        version);
  }

  public UUID getId() {
    return id;
  }

  public UUID getUserId() {
    return userId;
  }

  public String getTitle() {
    return title;
  }

  public String getDescription() {
    return description;
  }

  public String getCategory() {
    return category;
  }

  public GoalProgressType getProgressType() {
    return progressType;
  }

  public BigDecimal getTargetValue() {
    return targetValue;
  }

  public BigDecimal getCurrentValue() {
    return currentValue;
  }

  public String getUnit() {
    return unit;
  }

  public LocalDate getTargetDate() {
    return targetDate;
  }

  public GoalStatus getStatus() {
    return status;
  }

  public CheckInCadence getCheckInCadence() {
    return checkInCadence;
  }

  public boolean isArchived() {
    return archived;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public long getVersion() {
    return version;
  }
}
