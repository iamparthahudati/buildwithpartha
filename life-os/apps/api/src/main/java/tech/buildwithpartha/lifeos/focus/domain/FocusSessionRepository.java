package tech.buildwithpartha.lifeos.focus.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Ownership-scoped persistence boundary for Focus Sessions. */
public interface FocusSessionRepository {

  FocusSession save(FocusSession session);

  Optional<FocusSession> findByIdAndUserId(UUID id, UUID userId);

  Optional<FocusSession> findActiveByUserId(UUID userId);

  List<FocusSession> findByUserIdAndStartedAtBetween(
      UUID userId, Instant rangeStart, Instant rangeEnd);
}
