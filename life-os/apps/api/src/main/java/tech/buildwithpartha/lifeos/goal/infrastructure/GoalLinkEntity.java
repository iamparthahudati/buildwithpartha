package tech.buildwithpartha.lifeos.goal.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.goal.domain.GoalLink;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkTargetType;

/** JPA entity mapping to {@code public.goal_links}. */
@Entity
@Table(name = "goal_links", schema = "public")
class GoalLinkEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "goal_id", nullable = false, updatable = false)
  private UUID goalId;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "target_type", nullable = false)
  private GoalLinkTargetType targetType;

  @Column(name = "target_id", nullable = false)
  private UUID targetId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected GoalLinkEntity() {}

  GoalLinkEntity(
      UUID id,
      UUID goalId,
      UUID userId,
      GoalLinkTargetType targetType,
      UUID targetId,
      Instant createdAt) {
    this.id = id;
    this.goalId = goalId;
    this.userId = userId;
    this.targetType = targetType;
    this.targetId = targetId;
    this.createdAt = createdAt;
  }

  static GoalLinkEntity fromDomain(GoalLink domain) {
    return new GoalLinkEntity(
        domain.id(),
        domain.goalId(),
        domain.userId(),
        domain.targetType(),
        domain.targetId(),
        domain.createdAt());
  }

  GoalLink toDomain() {
    return new GoalLink(id, goalId, userId, targetType, targetId, createdAt);
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

  public GoalLinkTargetType getTargetType() {
    return targetType;
  }

  public UUID getTargetId() {
    return targetId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
