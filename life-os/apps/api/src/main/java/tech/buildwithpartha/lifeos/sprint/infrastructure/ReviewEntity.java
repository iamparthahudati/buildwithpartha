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
import tech.buildwithpartha.lifeos.sprint.domain.ReviewStatus;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

@Entity
@Table(name = "reviews", schema = "public")
class ReviewEntity {
  @Id private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "review_type", nullable = false, updatable = false)
  private ReviewType reviewType;

  @Column(name = "period_key", nullable = false, updatable = false)
  private String periodKey;

  @Column(name = "start_date", nullable = false)
  private LocalDate startDate;

  @Column(name = "end_date", nullable = false)
  private LocalDate endDate;

  @Column(name = "time_zone", nullable = false)
  private String timeZone;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ReviewStatus status;

  @Column(name = "skip_reason")
  private String skipReason;

  @Column(name = "finalized_at")
  private Instant finalizedAt;

  @Column(name = "snapshot_tasks_completed_count")
  private Integer snapshotTasksCompletedCount;

  @Column(name = "snapshot_tasks_planned_count")
  private Integer snapshotTasksPlannedCount;

  @Column(name = "snapshot_tasks_carried_over_count")
  private Integer snapshotTasksCarriedOverCount;

  @Column(name = "snapshot_tasks_cancelled_count")
  private Integer snapshotTasksCancelledCount;

  @Column(name = "snapshot_tasks_overdue_count")
  private Integer snapshotTasksOverdueCount;

  @Column(name = "snapshot_planned_focus_minutes")
  private Integer snapshotPlannedFocusMinutes;

  @Column(name = "snapshot_actual_focus_minutes")
  private Integer snapshotActualFocusMinutes;

  @Column(name = "snapshot_sprint_committed_count")
  private Integer snapshotSprintCommittedCount;

  @Column(name = "snapshot_sprint_completed_count")
  private Integer snapshotSprintCompletedCount;

  @Column(name = "snapshot_active_project_count")
  private Integer snapshotActiveProjectCount;

  @Column(name = "snapshot_completed_project_count")
  private Integer snapshotCompletedProjectCount;

  @Column(name = "snapshot_stalled_project_count")
  private Integer snapshotStalledProjectCount;

  @Column(name = "snapshot_daily_review_completion_count")
  private Integer snapshotDailyReviewCompletionCount;

  @Column(name = "snapshot_has_missing_data")
  private Boolean snapshotHasMissingData;

  @Column(name = "snapshot_missing_data_notes")
  private String snapshotMissingDataNotes;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(nullable = false)
  private long version;

  protected ReviewEntity() {}

  ReviewEntity(
      UUID id,
      UUID userId,
      ReviewType reviewType,
      String periodKey,
      LocalDate startDate,
      LocalDate endDate,
      String timeZone,
      ReviewStatus status,
      String skipReason,
      Instant finalizedAt,
      Integer snapshotTasksCompletedCount,
      Integer snapshotTasksPlannedCount,
      Integer snapshotTasksCarriedOverCount,
      Integer snapshotTasksCancelledCount,
      Integer snapshotTasksOverdueCount,
      Integer snapshotPlannedFocusMinutes,
      Integer snapshotActualFocusMinutes,
      Integer snapshotSprintCommittedCount,
      Integer snapshotSprintCompletedCount,
      Integer snapshotActiveProjectCount,
      Integer snapshotCompletedProjectCount,
      Integer snapshotStalledProjectCount,
      Integer snapshotDailyReviewCompletionCount,
      Boolean snapshotHasMissingData,
      String snapshotMissingDataNotes,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.reviewType = reviewType;
    this.periodKey = periodKey;
    this.startDate = startDate;
    this.endDate = endDate;
    this.timeZone = timeZone;
    this.status = status;
    this.skipReason = skipReason;
    this.finalizedAt = finalizedAt;
    this.snapshotTasksCompletedCount = snapshotTasksCompletedCount;
    this.snapshotTasksPlannedCount = snapshotTasksPlannedCount;
    this.snapshotTasksCarriedOverCount = snapshotTasksCarriedOverCount;
    this.snapshotTasksCancelledCount = snapshotTasksCancelledCount;
    this.snapshotTasksOverdueCount = snapshotTasksOverdueCount;
    this.snapshotPlannedFocusMinutes = snapshotPlannedFocusMinutes;
    this.snapshotActualFocusMinutes = snapshotActualFocusMinutes;
    this.snapshotSprintCommittedCount = snapshotSprintCommittedCount;
    this.snapshotSprintCompletedCount = snapshotSprintCompletedCount;
    this.snapshotActiveProjectCount = snapshotActiveProjectCount;
    this.snapshotCompletedProjectCount = snapshotCompletedProjectCount;
    this.snapshotStalledProjectCount = snapshotStalledProjectCount;
    this.snapshotDailyReviewCompletionCount = snapshotDailyReviewCompletionCount;
    this.snapshotHasMissingData = snapshotHasMissingData;
    this.snapshotMissingDataNotes = snapshotMissingDataNotes;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  public UUID getId() {
    return id;
  }

  public UUID getUserId() {
    return userId;
  }

  public ReviewType getReviewType() {
    return reviewType;
  }

  public String getPeriodKey() {
    return periodKey;
  }

  public LocalDate getStartDate() {
    return startDate;
  }

  public LocalDate getEndDate() {
    return endDate;
  }

  public String getTimeZone() {
    return timeZone;
  }

  public ReviewStatus getStatus() {
    return status;
  }

  public String getSkipReason() {
    return skipReason;
  }

  public Instant getFinalizedAt() {
    return finalizedAt;
  }

  public Integer getSnapshotTasksCompletedCount() {
    return snapshotTasksCompletedCount;
  }

  public Integer getSnapshotTasksPlannedCount() {
    return snapshotTasksPlannedCount;
  }

  public Integer getSnapshotTasksCarriedOverCount() {
    return snapshotTasksCarriedOverCount;
  }

  public Integer getSnapshotTasksCancelledCount() {
    return snapshotTasksCancelledCount;
  }

  public Integer getSnapshotTasksOverdueCount() {
    return snapshotTasksOverdueCount;
  }

  public Integer getSnapshotPlannedFocusMinutes() {
    return snapshotPlannedFocusMinutes;
  }

  public Integer getSnapshotActualFocusMinutes() {
    return snapshotActualFocusMinutes;
  }

  public Integer getSnapshotSprintCommittedCount() {
    return snapshotSprintCommittedCount;
  }

  public Integer getSnapshotSprintCompletedCount() {
    return snapshotSprintCompletedCount;
  }

  public Integer getSnapshotActiveProjectCount() {
    return snapshotActiveProjectCount;
  }

  public Integer getSnapshotCompletedProjectCount() {
    return snapshotCompletedProjectCount;
  }

  public Integer getSnapshotStalledProjectCount() {
    return snapshotStalledProjectCount;
  }

  public Integer getSnapshotDailyReviewCompletionCount() {
    return snapshotDailyReviewCompletionCount;
  }

  public Boolean getSnapshotHasMissingData() {
    return snapshotHasMissingData;
  }

  public String getSnapshotMissingDataNotes() {
    return snapshotMissingDataNotes;
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
