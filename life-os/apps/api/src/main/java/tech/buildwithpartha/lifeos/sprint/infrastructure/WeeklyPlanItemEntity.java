package tech.buildwithpartha.lifeos.sprint.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "weekly_plan_items", schema = "public")
class WeeklyPlanItemEntity {
  @Id private UUID id;

  @Column(name = "weekly_plan_id", nullable = false)
  private UUID weeklyPlanId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "task_id", nullable = false)
  private UUID taskId;

  @Column(name = "outcome_id")
  private UUID outcomeId;

  @Column(name = "planned_date")
  private LocalDate plannedDate;

  @Column(name = "planned_minutes", nullable = false)
  private int plannedMinutes;

  @Column(nullable = false)
  private int position;

  @Column(name = "task_title_snapshot", nullable = false)
  private String taskTitleSnapshot;

  @Column(name = "task_status_snapshot", nullable = false)
  private String taskStatusSnapshot;

  protected WeeklyPlanItemEntity() {}

  WeeklyPlanItemEntity(
      UUID id,
      UUID weeklyPlanId,
      UUID userId,
      UUID taskId,
      UUID outcomeId,
      LocalDate plannedDate,
      int plannedMinutes,
      int position,
      String taskTitleSnapshot,
      String taskStatusSnapshot) {
    this.id = id;
    this.weeklyPlanId = weeklyPlanId;
    this.userId = userId;
    this.taskId = taskId;
    this.outcomeId = outcomeId;
    this.plannedDate = plannedDate;
    this.plannedMinutes = plannedMinutes;
    this.position = position;
    this.taskTitleSnapshot = taskTitleSnapshot;
    this.taskStatusSnapshot = taskStatusSnapshot;
  }

  UUID getId() {
    return id;
  }

  UUID getTaskId() {
    return taskId;
  }

  UUID getOutcomeId() {
    return outcomeId;
  }

  LocalDate getPlannedDate() {
    return plannedDate;
  }

  int getPlannedMinutes() {
    return plannedMinutes;
  }

  int getPosition() {
    return position;
  }

  String getTaskTitleSnapshot() {
    return taskTitleSnapshot;
  }

  String getTaskStatusSnapshot() {
    return taskStatusSnapshot;
  }
}
