package tech.buildwithpartha.lifeos.sprint.domain;

import java.util.Objects;
import java.util.UUID;

public record ReviewAnswer(UUID id, String promptKey, String answerValue) {
  public ReviewAnswer {
    Objects.requireNonNull(id);
    Objects.requireNonNull(promptKey);
    Objects.requireNonNull(answerValue);
    if (promptKey.isBlank() || promptKey.length() > 100) {
      throw new IllegalArgumentException("Prompt key must be between 1 and 100 characters");
    }
  }
}
