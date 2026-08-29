package tech.buildwithpartha.lifeos.sprint.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "review_answers", schema = "public")
class ReviewAnswerEntity {
  @Id private UUID id;

  @Column(name = "review_id", nullable = false, updatable = false)
  private UUID reviewId;

  @Column(name = "prompt_key", nullable = false)
  private String promptKey;

  @Column(name = "answer_value", nullable = false)
  private String answerValue;

  protected ReviewAnswerEntity() {}

  ReviewAnswerEntity(UUID id, UUID reviewId, String promptKey, String answerValue) {
    this.id = id;
    this.reviewId = reviewId;
    this.promptKey = promptKey;
    this.answerValue = answerValue;
  }

  public UUID getId() {
    return id;
  }

  public UUID getReviewId() {
    return reviewId;
  }

  public String getPromptKey() {
    return promptKey;
  }

  public String getAnswerValue() {
    return answerValue;
  }
}
