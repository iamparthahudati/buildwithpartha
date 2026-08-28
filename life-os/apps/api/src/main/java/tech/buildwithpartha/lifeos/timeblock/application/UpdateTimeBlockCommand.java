package tech.buildwithpartha.lifeos.timeblock.application;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** Command parameters for updating an existing TimeBlock. */
public record UpdateTimeBlockCommand(
    String title,
    String category,
    TimeBlockStatus status,
    Instant startAt,
    Instant endAt,
    String sourceTimeZone,
    Optional<String> notes,
    Optional<UUID> projectId,
    Optional<UUID> taskId,
    long version,
    boolean allowOverlap) {

  public UpdateTimeBlockCommand {
    notes = notes == null ? Optional.empty() : notes;
    projectId = projectId == null ? Optional.empty() : projectId;
    taskId = taskId == null ? Optional.empty() : taskId;
  }
}
