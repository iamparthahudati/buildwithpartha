package tech.buildwithpartha.lifeos.common.time;

import java.time.Instant;
import java.util.UUID;

/** Domain-neutral read contract for completed Focus Session time and active state. */
public interface FocusTimeSummaryProvider {

  FocusTimeSummary summarize(UUID userId, Instant rangeStart, Instant rangeEnd, Instant now);
}
