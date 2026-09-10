package tech.buildwithpartha.lifeos.common.time;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Domain-neutral TimeBlock read port for Today dashboard aggregation (LOS-1415). */
public interface TimeBlockTodayPort {

  List<TodayTimeBlockRecord> getTodayTimeBlocks(
      UUID userId, Instant rangeStart, Instant rangeEnd, ZoneId zoneId);

  record TodayTimeBlockRecord(
      UUID id,
      String title,
      LocalTime startTime,
      LocalTime endTime,
      String category,
      Optional<UUID> projectId,
      boolean completed,
      Instant startAt,
      Instant endAt) {}
}
