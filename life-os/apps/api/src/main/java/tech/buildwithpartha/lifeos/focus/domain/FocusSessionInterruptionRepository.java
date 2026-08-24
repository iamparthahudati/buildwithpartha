package tech.buildwithpartha.lifeos.focus.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Ownership-scoped persistence boundary for Focus Session interruption events. */
public interface FocusSessionInterruptionRepository {

  FocusSessionInterruption save(FocusSessionInterruption interruption);

  Optional<FocusSessionInterruption> findByIdAndUserId(UUID id, UUID userId);

  List<FocusSessionInterruption> findByFocusSessionIdAndUserId(UUID focusSessionId, UUID userId);
}
