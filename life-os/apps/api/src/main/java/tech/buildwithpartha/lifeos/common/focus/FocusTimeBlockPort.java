package tech.buildwithpartha.lifeos.common.focus;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Domain-neutral Time Block boundary used by Focus Session orchestration. */
public interface FocusTimeBlockPort {

  Optional<UUID> startFocus(UUID userId, UUID timeBlockId, Instant now);

  void completeFocus(UUID userId, UUID timeBlockId, Instant now);

  void cancelFocus(UUID userId, UUID timeBlockId, Instant now);
}
