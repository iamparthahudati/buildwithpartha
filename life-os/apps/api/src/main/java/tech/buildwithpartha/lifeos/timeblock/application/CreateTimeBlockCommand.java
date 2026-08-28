package tech.buildwithpartha.lifeos.timeblock.application;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** Command parameters for creating a new TimeBlock. */
public record CreateTimeBlockCommand(
    String title,
    String category,
    TimeBlockStatus status,
    Instant startAt,
    Instant endAt,
    String sourceTimeZone,
    Optional<String> notes,
    Optional<UUID> projectId,
    Optional<UUID> taskId,
    boolean allowOverlap) {

  public CreateTimeBlockCommand {
    notes = notes == null ? Optional.empty() : notes;
    projectId = projectId == null ? Optional.empty() : projectId;
    taskId = taskId == null ? Optional.empty() : taskId;
  }
}
