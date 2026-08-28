package tech.buildwithpartha.lifeos.common.time;

import java.time.Instant;
import java.util.UUID;

/** Domain-neutral read contract for scheduled Time Block allocation. */
public interface TimeBlockTimeSummaryProvider {

  TimeBlockTimeSummary summarize(UUID userId, Instant rangeStart, Instant rangeEnd);
}
