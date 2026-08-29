package tech.buildwithpartha.lifeos.goal.domain;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Immutable domain query parameters for filtering and paginating Goals. */
public record GoalQuery(
    UUID userId,
    String q,
    Set<GoalStatus> statuses,
    String category,
    Set<GoalProgressType> progressTypes,
    Boolean archived,
    int page,
    int size,
    String sortBy,
    String sortDirection) {

  public GoalQuery {
    Objects.requireNonNull(userId, "userId must not be null");
    statuses = statuses == null ? Set.of() : Set.copyOf(statuses);
    progressTypes = progressTypes == null ? Set.of() : Set.copyOf(progressTypes);
    if (page < 0) {
      throw new IllegalArgumentException("page must not be negative");
    }
    if (size < 1 || size > 100) {
      throw new IllegalArgumentException("size must be between 1 and 100");
    }
  }
}
