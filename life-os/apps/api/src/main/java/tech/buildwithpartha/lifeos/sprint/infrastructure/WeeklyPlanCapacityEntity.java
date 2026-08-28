package tech.buildwithpartha.lifeos.sprint.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "weekly_plan_capacities", schema = "public")
class WeeklyPlanCapacityEntity {
  @Id private UUID id;

  @Column(name = "weekly_plan_id", nullable = false)
  private UUID weeklyPlanId;

  @Column(name = "local_date", nullable = false)
  private LocalDate localDate;

  @Column(name = "available_minutes", nullable = false)
  private int availableMinutes;

  protected WeeklyPlanCapacityEntity() {}

  WeeklyPlanCapacityEntity(UUID id, UUID weeklyPlanId, LocalDate localDate, int availableMinutes) {
    this.id = id;
    this.weeklyPlanId = weeklyPlanId;
    this.localDate = localDate;
    this.availableMinutes = availableMinutes;
  }

  LocalDate getLocalDate() {
    return localDate;
  }

  int getAvailableMinutes() {
    return availableMinutes;
  }
}
