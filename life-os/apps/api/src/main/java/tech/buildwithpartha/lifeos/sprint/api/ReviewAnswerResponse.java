package tech.buildwithpartha.lifeos.sprint.api;

import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewAnswer;

public record ReviewAnswerResponse(UUID id, String promptKey, String answerValue) {
  public static ReviewAnswerResponse fromDomain(ReviewAnswer answer) {
    return new ReviewAnswerResponse(answer.id(), answer.promptKey(), answer.answerValue());
  }
}
