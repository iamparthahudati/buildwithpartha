package tech.buildwithpartha.lifeos.sprint.infrastructure;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.domain.SprintStatus;

@Entity
@Table(name = "sprints", schema = "public")
class SprintEntity {
  @Id private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(nullable = false)
  private String name;

  private String goal;

  @Column(name = "start_date", nullable = false)
  private LocalDate startDate;

  @Column(name = "end_date", nullable = false)
  private LocalDate endDate;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SprintStatus status;

  @Column(name = "target_capacity_points", nullable = false)
  private int targetCapacityPoints;

  @Column(name = "retrospective_notes")
  private String retrospectiveNotes;

  @Column(name = "what_went_well")
  private String whatWentWell;

  @Column(name = "what_could_be_improved")
  private String whatCouldBeImproved;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(
      name = "sprint_action_items",
      schema = "public",
      joinColumns = @JoinColumn(name = "sprint_id"))
  @Column(name = "body", nullable = false)
  @OrderColumn(name = "position")
  private List<String> actionItems = new ArrayList<>();

  @Column(name = "committed_task_count", nullable = false)
  private int committedTaskCount;

  @Column(name = "completed_task_count", nullable = false)
  private int completedTaskCount;

  @Column(name = "added_task_count", nullable = false)
  private int addedTaskCount;

  @Column(name = "removed_task_count", nullable = false)
  private int removedTaskCount;

  @Column(name = "carried_over_task_count", nullable = false)
  private int carriedOverTaskCount;

  @Column(name = "total_story_points", nullable = false)
  private int totalStoryPoints;

  @Column(name = "completed_story_points", nullable = false)
  private int completedStoryPoints;

  @Column(name = "completed_at")
  private Instant completedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(nullable = false)
  private long version;

  protected SprintEntity() {}

  SprintEntity(
      UUID id,
      UUID userId,
      String name,
      String goal,
      LocalDate startDate,
      LocalDate endDate,
      SprintStatus status,
      int targetCapacityPoints,
      String retrospectiveNotes,
      String whatWentWell,
      String whatCouldBeImproved,
      List<String> actionItems,
      int committedTaskCount,
      int completedTaskCount,
      int addedTaskCount,
      int removedTaskCount,
      int carriedOverTaskCount,
      int totalStoryPoints,
      int completedStoryPoints,
      Instant completedAt,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.goal = goal;
    this.startDate = startDate;
    this.endDate = endDate;
    this.status = status;
    this.targetCapacityPoints = targetCapacityPoints;
    this.retrospectiveNotes = retrospectiveNotes;
    this.whatWentWell = whatWentWell;
    this.whatCouldBeImproved = whatCouldBeImproved;
    this.actionItems = new ArrayList<>(actionItems);
    this.committedTaskCount = committedTaskCount;
    this.completedTaskCount = completedTaskCount;
    this.addedTaskCount = addedTaskCount;
    this.removedTaskCount = removedTaskCount;
    this.carriedOverTaskCount = carriedOverTaskCount;
    this.totalStoryPoints = totalStoryPoints;
    this.completedStoryPoints = completedStoryPoints;
    this.completedAt = completedAt;
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

  String getName() {
    return name;
  }

  String getGoal() {
    return goal;
  }

  LocalDate getStartDate() {
    return startDate;
  }

  LocalDate getEndDate() {
    return endDate;
  }

  SprintStatus getStatus() {
    return status;
  }

  int getTargetCapacityPoints() {
    return targetCapacityPoints;
  }

  String getRetrospectiveNotes() {
    return retrospectiveNotes;
  }

  String getWhatWentWell() {
    return whatWentWell;
  }

  String getWhatCouldBeImproved() {
    return whatCouldBeImproved;
  }

  List<String> getActionItems() {
    return actionItems;
  }

  int getCommittedTaskCount() {
    return committedTaskCount;
  }

  int getCompletedTaskCount() {
    return completedTaskCount;
  }

  int getAddedTaskCount() {
    return addedTaskCount;
  }

  int getRemovedTaskCount() {
    return removedTaskCount;
  }

  int getCarriedOverTaskCount() {
    return carriedOverTaskCount;
  }

  int getTotalStoryPoints() {
    return totalStoryPoints;
  }

  int getCompletedStoryPoints() {
    return completedStoryPoints;
  }

  Instant getCompletedAt() {
    return completedAt;
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
