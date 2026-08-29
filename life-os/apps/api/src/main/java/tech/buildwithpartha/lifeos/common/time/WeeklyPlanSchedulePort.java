package tech.buildwithpartha.lifeos.common.time;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Time Block-owned read boundary for Weekly Plan conflict preflight. */
@FunctionalInterface
public interface WeeklyPlanSchedulePort {
  List<WeeklyPlanTimeBlock> getScheduledBlocks(UUID userId, Instant start, Instant end);
}
