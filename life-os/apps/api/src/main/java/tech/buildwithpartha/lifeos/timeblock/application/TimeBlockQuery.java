package tech.buildwithpartha.lifeos.timeblock.application;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/** Parameters for querying a user's TimeBlocks for day/week or date-range views. */
public record TimeBlockQuery(
    UUID userId,
    Optional<Instant> rangeStart,
    Optional<Instant> rangeEnd,
    Optional<LocalDate> date,
    Optional<String> timeZone,
    Optional<UUID> projectId,
    Optional<UUID> taskId) {

  public TimeBlockQuery {
    rangeStart = rangeStart == null ? Optional.empty() : rangeStart;
    rangeEnd = rangeEnd == null ? Optional.empty() : rangeEnd;
    date = date == null ? Optional.empty() : date;
    timeZone = timeZone == null ? Optional.empty() : timeZone;
    projectId = projectId == null ? Optional.empty() : projectId;
    taskId = taskId == null ? Optional.empty() : taskId;
  }
}
