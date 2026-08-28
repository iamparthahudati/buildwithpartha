package tech.buildwithpartha.lifeos.sprint.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "review_item_decisions", schema = "public")
class ReviewItemDecisionEntity {
  @Id private UUID id;

  @Column(name = "review_id", nullable = false, updatable = false)
  private UUID reviewId;

  @Column(name = "item_type", nullable = false)
  private String itemType;

  @Column(name = "item_id", nullable = false)
  private UUID itemId;

  @Column(name = "action", nullable = false)
  private String action;

  @Column(name = "target_date")
  private LocalDate targetDate;

  @Column(name = "notes")
  private String notes;

  protected ReviewItemDecisionEntity() {}

  ReviewItemDecisionEntity(
      UUID id,
      UUID reviewId,
      String itemType,
      UUID itemId,
      String action,
      LocalDate targetDate,
      String notes) {
    this.id = id;
    this.reviewId = reviewId;
    this.itemType = itemType;
    this.itemId = itemId;
    this.action = action;
    this.targetDate = targetDate;
    this.notes = notes;
  }

  public UUID getId() {
    return id;
  }

  public UUID getReviewId() {
    return reviewId;
  }

  public String getItemType() {
    return itemType;
  }

  public UUID getItemId() {
    return itemId;
  }

  public String getAction() {
    return action;
  }

  public LocalDate getTargetDate() {
    return targetDate;
  }

  public String getNotes() {
    return notes;
  }
}
