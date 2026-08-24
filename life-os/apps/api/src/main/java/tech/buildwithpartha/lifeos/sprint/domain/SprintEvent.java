package tech.buildwithpartha.lifeos.sprint.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public record SprintEvent(
    UUID id,
    SprintEventType eventType,
    Optional<UUID> taskId,
    Optional<Integer> pointsDelta,
    Optional<String> reason,
    Instant occurredAt) {
  public SprintEvent {
    Objects.requireNonNull(id);
    Objects.requireNonNull(eventType);
    Objects.requireNonNull(taskId);
    Objects.requireNonNull(pointsDelta);
    Objects.requireNonNull(reason);
    Objects.requireNonNull(occurredAt);
  }

  public static SprintEvent of(
      SprintEventType type, UUID taskId, Integer pointsDelta, String reason, Instant now) {
    return new SprintEvent(
        UUID.randomUUID(),
        type,
        Optional.ofNullable(taskId),
        Optional.ofNullable(pointsDelta),
        Optional.ofNullable(reason).map(String::trim).filter(value -> !value.isEmpty()),
        now);
  }
}
