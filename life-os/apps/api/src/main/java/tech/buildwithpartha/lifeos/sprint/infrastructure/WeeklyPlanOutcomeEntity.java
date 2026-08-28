package tech.buildwithpartha.lifeos.sprint.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "weekly_plan_outcomes", schema = "public")
class WeeklyPlanOutcomeEntity {
  @Id private UUID id;

  @Column(name = "weekly_plan_id", nullable = false)
  private UUID weeklyPlanId;

  @Column(nullable = false)
  private String title;

  @Column(nullable = false)
  private int position;

  protected WeeklyPlanOutcomeEntity() {}

  WeeklyPlanOutcomeEntity(UUID id, UUID weeklyPlanId, String title, int position) {
    this.id = id;
    this.weeklyPlanId = weeklyPlanId;
    this.title = title;
    this.position = position;
  }

  UUID getId() {
    return id;
  }

  String getTitle() {
    return title;
  }

  int getPosition() {
    return position;
  }
}
