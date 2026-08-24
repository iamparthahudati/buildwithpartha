package tech.buildwithpartha.lifeos.timeblock.application;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.time.TimeBlockCategoryMinutes;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTimeSummary;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTimeSummaryProvider;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** Exact, local-day-clipped Time Block totals used by calculated projections. */
@Component
public class TimeBlockTimeSummaryAdapter implements TimeBlockTimeSummaryProvider {

  private static final String FOCUS_CATEGORY = "FOCUS";
  private static final String PERSONAL_CATEGORY = "PERSONAL";

  private final TimeBlockRepository repository;

  public TimeBlockTimeSummaryAdapter(TimeBlockRepository repository) {
    this.repository = repository;
  }

  @Override
  @Transactional(readOnly = true)
  public TimeBlockTimeSummary summarize(UUID userId, Instant rangeStart, Instant rangeEnd) {
    Map<String, CategoryTotal> totals = new LinkedHashMap<>();
    int plannedFocusMinutes = 0;
    int personalMinutes = 0;

    for (TimeBlock block : repository.findByUserIdAndRange(userId, rangeStart, rangeEnd)) {
      if (block.status() == TimeBlockStatus.CANCELLED) {
        continue;
      }
      int minutes = clippedMinutes(block, rangeStart, rangeEnd);
      if (minutes == 0) {
        continue;
      }
      String displayCategory = block.category().trim();
      String normalizedCategory = displayCategory.toUpperCase(Locale.ROOT);
      totals.compute(
          normalizedCategory,
          (ignored, current) ->
              current == null
                  ? new CategoryTotal(displayCategory, minutes)
                  : current.plus(minutes));
      if (FOCUS_CATEGORY.equals(normalizedCategory)) {
        plannedFocusMinutes += minutes;
      }
      if (PERSONAL_CATEGORY.equals(normalizedCategory)) {
        personalMinutes += minutes;
      }
    }

    return new TimeBlockTimeSummary(
        plannedFocusMinutes,
        personalMinutes,
        totals.values().stream()
            .map(total -> new TimeBlockCategoryMinutes(total.category(), total.minutes()))
            .toList());
  }

  private static int clippedMinutes(TimeBlock block, Instant rangeStart, Instant rangeEnd) {
    Instant clippedStart = block.startAt().isAfter(rangeStart) ? block.startAt() : rangeStart;
    Instant clippedEnd = block.endAt().isBefore(rangeEnd) ? block.endAt() : rangeEnd;
    return Math.toIntExact(Duration.between(clippedStart, clippedEnd).toMinutes());
  }

  private record CategoryTotal(String category, int minutes) {
    CategoryTotal plus(int additionalMinutes) {
      return new CategoryTotal(category, minutes + additionalMinutes);
    }
  }
}
