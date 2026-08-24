package tech.buildwithpartha.lifeos.focus.domain;

import java.util.List;
import java.util.UUID;

/** Ownership-scoped persistence boundary for Focus Session interruption events. */
public interface FocusSessionInterruptionRepository {

  FocusSessionInterruption save(FocusSessionInterruption interruption);

  List<FocusSessionInterruption> findByFocusSessionIdAndUserId(UUID focusSessionId, UUID userId);
}
