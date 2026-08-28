package tech.buildwithpartha.lifeos.timeblock.application;

import java.util.Optional;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** Command parameters for changing a TimeBlock status. */
public record ChangeTimeBlockStatusCommand(TimeBlockStatus status, Optional<Long> version) {

  public ChangeTimeBlockStatusCommand {
    version = version == null ? Optional.empty() : version;
  }
}
