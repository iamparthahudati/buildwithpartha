package tech.buildwithpartha.lifeos.common.focus;

import java.time.Instant;
import java.util.UUID;

/** Domain-neutral Task boundary used by Focus Session orchestration. */
public interface FocusTaskPort {

  void validateStart(UUID userId, UUID taskId);

  void recordCompletedMinutes(UUID userId, UUID taskId, int minutes, Instant now);
}
