package tech.buildwithpartha.lifeos.sprint.infrastructure;

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
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanStatus;

@Entity
@Table(name = "weekly_plans", schema = "public")
class WeeklyPlanEntity {
  @Id private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "week_start_date", nullable = false, updatable = false)
  private LocalDate weekStartDate;

  @Column(name = "week_end_date", nullable = false, updatable = false)
  private LocalDate weekEndDate;

  @Column(name = "time_zone", nullable = false, updatable = false)
  private String timeZone;

  @Column(name = "week_start_day", nullable = false, updatable = false)
  private int weekStartDay;

  @Column(nullable = false, updatable = false)
  private int revision;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private WeeklyPlanStatus status;

  @Column(name = "predecessor_plan_id", updatable = false)
  private UUID predecessorPlanId;

  @Column(name = "finalized_at")
  private Instant finalizedAt;

  @Column(name = "snapshot_total_planned_minutes")
  private Integer snapshotTotalPlannedMinutes;

  @Column(name = "snapshot_total_capacity_minutes")
  private Integer snapshotTotalCapacityMinutes;

  @Column(name = "snapshot_overcapacity_minutes")
  private Integer snapshotOvercapacityMinutes;

  @Column(name = "snapshot_overcapacity_dates")
  private String snapshotOvercapacityDates;

  @Column(name = "snapshot_overlapping_time_block_count")
  private Integer snapshotOverlappingTimeBlockCount;

  @Column(name = "snapshot_unscheduled_item_count")
  private Integer snapshotUnscheduledItemCount;

  @Column(name = "snapshot_outcomes_without_items_count")
  private Integer snapshotOutcomesWithoutItemsCount;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(nullable = false)
  private long version;

  protected WeeklyPlanEntity() {}

  WeeklyPlanEntity(
      UUID id,
      UUID userId,
      LocalDate weekStartDate,
      LocalDate weekEndDate,
      String timeZone,
      int weekStartDay,
      int revision,
      WeeklyPlanStatus status,
      UUID predecessorPlanId,
      Instant finalizedAt,
      Integer snapshotTotalPlannedMinutes,
      Integer snapshotTotalCapacityMinutes,
      Integer snapshotOvercapacityMinutes,
      String snapshotOvercapacityDates,
      Integer snapshotOverlappingTimeBlockCount,
      Integer snapshotUnscheduledItemCount,
      Integer snapshotOutcomesWithoutItemsCount,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.weekStartDate = weekStartDate;
    this.weekEndDate = weekEndDate;
    this.timeZone = timeZone;
    this.weekStartDay = weekStartDay;
    this.revision = revision;
    this.status = status;
    this.predecessorPlanId = predecessorPlanId;
    this.finalizedAt = finalizedAt;
    this.snapshotTotalPlannedMinutes = snapshotTotalPlannedMinutes;
    this.snapshotTotalCapacityMinutes = snapshotTotalCapacityMinutes;
    this.snapshotOvercapacityMinutes = snapshotOvercapacityMinutes;
    this.snapshotOvercapacityDates = snapshotOvercapacityDates;
    this.snapshotOverlappingTimeBlockCount = snapshotOverlappingTimeBlockCount;
    this.snapshotUnscheduledItemCount = snapshotUnscheduledItemCount;
    this.snapshotOutcomesWithoutItemsCount = snapshotOutcomesWithoutItemsCount;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  LocalDate getWeekStartDate() {
    return weekStartDate;
  }

  LocalDate getWeekEndDate() {
    return weekEndDate;
  }

  String getTimeZone() {
    return timeZone;
  }

  int getWeekStartDay() {
    return weekStartDay;
  }

  int getRevision() {
    return revision;
  }

  WeeklyPlanStatus getStatus() {
    return status;
  }

  UUID getPredecessorPlanId() {
    return predecessorPlanId;
  }

  Instant getFinalizedAt() {
    return finalizedAt;
  }

  Integer getSnapshotTotalPlannedMinutes() {
    return snapshotTotalPlannedMinutes;
  }

  Integer getSnapshotTotalCapacityMinutes() {
    return snapshotTotalCapacityMinutes;
  }

  Integer getSnapshotOvercapacityMinutes() {
    return snapshotOvercapacityMinutes;
  }

  String getSnapshotOvercapacityDates() {
    return snapshotOvercapacityDates;
  }

  Integer getSnapshotOverlappingTimeBlockCount() {
    return snapshotOverlappingTimeBlockCount;
  }

  Integer getSnapshotUnscheduledItemCount() {
    return snapshotUnscheduledItemCount;
  }

  Integer getSnapshotOutcomesWithoutItemsCount() {
    return snapshotOutcomesWithoutItemsCount;
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
