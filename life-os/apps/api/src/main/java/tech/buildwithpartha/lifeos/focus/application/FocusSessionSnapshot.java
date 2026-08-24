package tech.buildwithpartha.lifeos.focus.application;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionInterruption;

/** Recoverable Focus Session state paired with the authoritative response instant. */
public record FocusSessionSnapshot(
    FocusSession session,
    List<FocusSessionInterruption> interruptions,
    Instant serverNow,
    Duration actualFocusDuration,
    Duration actualBreakDuration) {

  public FocusSessionSnapshot {
    Objects.requireNonNull(session, "session must not be null");
    interruptions = List.copyOf(interruptions);
    Objects.requireNonNull(serverNow, "serverNow must not be null");
    Objects.requireNonNull(actualFocusDuration, "actualFocusDuration must not be null");
    Objects.requireNonNull(actualBreakDuration, "actualBreakDuration must not be null");
  }
}
