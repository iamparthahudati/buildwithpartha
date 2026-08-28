package tech.buildwithpartha.lifeos.sprint.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sprint_tasks", schema = "public")
class SprintTaskEntity {
  @Id private UUID id;

  @Column(name = "sprint_id", nullable = false)
  private UUID sprintId;

  @Column(name = "task_id", nullable = false)
  private UUID taskId;

  @Column(name = "story_points", nullable = false)
  private int storyPoints;

  @Column(nullable = false)
  private int position;

  @Column(name = "added_after_start", nullable = false)
  private boolean addedAfterStart;

  @Column(name = "committed_at", nullable = false)
  private Instant committedAt;

  @Column(name = "removed_at")
  private Instant removedAt;

  @Column(name = "carried_over_to_sprint_id")
  private UUID carriedOverToSprintId;

  protected SprintTaskEntity() {}

  SprintTaskEntity(
      UUID id,
      UUID sprintId,
      UUID taskId,
      int storyPoints,
      int position,
      boolean addedAfterStart,
      Instant committedAt,
      Instant removedAt,
      UUID carriedOverToSprintId) {
    this.id = id;
    this.sprintId = sprintId;
    this.taskId = taskId;
    this.storyPoints = storyPoints;
    this.position = position;
    this.addedAfterStart = addedAfterStart;
    this.committedAt = committedAt;
    this.removedAt = removedAt;
    this.carriedOverToSprintId = carriedOverToSprintId;
  }

  UUID getId() {
    return id;
  }

  UUID getTaskId() {
    return taskId;
  }

  int getStoryPoints() {
    return storyPoints;
  }

  int getPosition() {
    return position;
  }

  boolean isAddedAfterStart() {
    return addedAfterStart;
  }

  Instant getCommittedAt() {
    return committedAt;
  }

  Instant getRemovedAt() {
    return removedAt;
  }

  UUID getCarriedOverToSprintId() {
    return carriedOverToSprintId;
  }
}
