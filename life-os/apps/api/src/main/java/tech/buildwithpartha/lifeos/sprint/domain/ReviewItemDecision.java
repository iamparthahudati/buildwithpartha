package tech.buildwithpartha.lifeos.sprint.domain;

import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public record ReviewItemDecision(
    UUID id,
    String itemType,
    UUID itemId,
    String action,
    Optional<LocalDate> targetDate,
    Optional<String> notes) {
  public ReviewItemDecision {
    Objects.requireNonNull(id);
    Objects.requireNonNull(itemType);
    Objects.requireNonNull(itemId);
    Objects.requireNonNull(action);
    Objects.requireNonNull(targetDate);
    Objects.requireNonNull(notes);
    if (!itemType.equals("TASK") && !itemType.equals("PROJECT") && !itemType.equals("GOAL")) {
      throw new IllegalArgumentException("Invalid item type: " + itemType);
    }
  }
}
