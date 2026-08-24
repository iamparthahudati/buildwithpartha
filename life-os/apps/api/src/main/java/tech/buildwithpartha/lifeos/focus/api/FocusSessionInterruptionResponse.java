package tech.buildwithpartha.lifeos.focus.api;

import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionInterruption;

/** Private interruption projection nested inside its owning Focus Session. */
public record FocusSessionInterruptionResponse(
    UUID id, Instant occurredAt, String note, Instant createdAt, long version) {

  static FocusSessionInterruptionResponse fromDomain(FocusSessionInterruption interruption) {
    return new FocusSessionInterruptionResponse(
        interruption.id(),
        interruption.occurredAt(),
        interruption.note().orElse(null),
        interruption.createdAt(),
        interruption.version());
  }
}
