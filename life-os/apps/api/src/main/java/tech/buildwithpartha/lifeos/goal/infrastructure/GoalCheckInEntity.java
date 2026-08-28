package tech.buildwithpartha.lifeos.goal.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckIn;

/** JPA entity mapping to {@code public.goal_check_ins}. */
@Entity
@Table(name = "goal_check_ins", schema = "public")
class GoalCheckInEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "goal_id", nullable = false, updatable = false)
  private UUID goalId;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "\"value\"", nullable = false)
  private BigDecimal value;

  @Column(name = "note")
  private String note;

  @Column(name = "recorded_at", nullable = false)
  private Instant recordedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected GoalCheckInEntity() {}

  GoalCheckInEntity(
      UUID id,
      UUID goalId,
      UUID userId,
      BigDecimal value,
      String note,
      Instant recordedAt,
      Instant createdAt) {
    this.id = id;
    this.goalId = goalId;
    this.userId = userId;
    this.value = value;
    this.note = note;
    this.recordedAt = recordedAt;
    this.createdAt = createdAt;
  }

  static GoalCheckInEntity fromDomain(GoalCheckIn domain) {
    return new GoalCheckInEntity(
        domain.id(),
        domain.goalId(),
        domain.userId(),
        domain.value(),
        domain.note().orElse(null),
        domain.recordedAt(),
        domain.createdAt());
  }

  GoalCheckIn toDomain() {
    return new GoalCheckIn(
        id, goalId, userId, value, Optional.ofNullable(note), recordedAt, createdAt);
  }

  public UUID getId() {
    return id;
  }

  public UUID getGoalId() {
    return goalId;
  }

  public UUID getUserId() {
    return userId;
  }

  public BigDecimal getValue() {
    return value;
  }

  public String getNote() {
    return note;
  }

  public Instant getRecordedAt() {
    return recordedAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
