package tech.buildwithpartha.lifeos.common.focus;

import java.util.Optional;
import java.util.UUID;

/**
 * Domain-neutral Focus read port to check active focus task state for Today aggregation (LOS-1415).
 */
public interface FocusActiveTaskPort {

  Optional<UUID> getActiveFocusTaskId(UUID userId);
}
