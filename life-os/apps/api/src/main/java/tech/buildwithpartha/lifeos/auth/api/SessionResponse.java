package tech.buildwithpartha.lifeos.auth.api;

import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.auth.application.SessionDto;

public record SessionResponse(
    UUID id, String deviceHint, Instant createdAt, Instant lastSeenAt, boolean isCurrent) {

  public static SessionResponse from(SessionDto dto) {
    return new SessionResponse(
        dto.id(),
        dto.deviceHint().orElse(null),
        dto.createdAt(),
        dto.lastSeenAt(),
        dto.isCurrent());
  }
}
