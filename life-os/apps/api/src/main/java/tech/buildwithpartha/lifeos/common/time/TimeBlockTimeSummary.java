package tech.buildwithpartha.lifeos.common.time;

import java.util.List;
import java.util.Objects;

/** Content-free Time Block totals for one requested instant range. */
public record TimeBlockTimeSummary(
    int plannedFocusMinutes, int personalMinutes, List<TimeBlockCategoryMinutes> categories) {

  public TimeBlockTimeSummary {
    Objects.requireNonNull(categories, "categories must not be null");
    if (plannedFocusMinutes < 0 || personalMinutes < 0) {
      throw new IllegalArgumentException("Time Block summary minutes must not be negative");
    }
    categories = List.copyOf(categories);
  }
}
