package tech.buildwithpartha.lifeos.common.time;

import java.util.Objects;

/** Exact Time Block minutes grouped under one user-visible category. */
public record TimeBlockCategoryMinutes(String category, int minutes) {

  public TimeBlockCategoryMinutes {
    Objects.requireNonNull(category, "category must not be null");
    if (category.isBlank()) {
      throw new IllegalArgumentException("category must not be blank");
    }
    if (minutes < 0) {
      throw new IllegalArgumentException("minutes must not be negative");
    }
  }
}
