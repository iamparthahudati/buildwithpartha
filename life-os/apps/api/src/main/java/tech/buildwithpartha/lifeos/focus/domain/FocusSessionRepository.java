package tech.buildwithpartha.lifeos.focus.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Ownership-scoped persistence boundary for Focus Sessions. */
public interface FocusSessionRepository {

  /** Serializes Focus Session writes for one account, including the first active-session insert. */
  void lockUser(UUID userId);

  FocusSession save(FocusSession session);

  Optional<FocusSession> findByIdAndUserId(UUID id, UUID userId);

  Optional<FocusSession> findActiveByUserId(UUID userId);

  List<FocusSession> findByUserIdAndStartedAtBetween(
      UUID userId, Instant rangeStart, Instant rangeEnd);
}
