package tech.buildwithpartha.lifeos.sprint.application;

import java.time.LocalDate;
import java.util.Objects;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

public record SkipReviewCommand(
    ReviewType reviewType,
    String periodKey,
    LocalDate startDate,
    LocalDate endDate,
    String timeZone,
    String reason) {
  public SkipReviewCommand {
    Objects.requireNonNull(reviewType);
    Objects.requireNonNull(periodKey);
    Objects.requireNonNull(startDate);
    Objects.requireNonNull(endDate);
    Objects.requireNonNull(timeZone);
    Objects.requireNonNull(reason);
    if (reason.isBlank()) {
      throw new IllegalArgumentException("Skip reason cannot be blank");
    }
  }
}
