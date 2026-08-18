package tech.buildwithpartha.lifeos.auth.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * The {@code public.credentials} row: exactly one password hash per {@link User}, produced by
 * {@code auth.application.PasswordService} (LOS-0502).
 */
public record Credential(
    UUID id,
    UUID userId,
    String passwordHash,
    Instant changedAt,
    Instant createdAt,
    Instant updatedAt) {

  public Credential {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(passwordHash, "passwordHash must not be null");
    Objects.requireNonNull(changedAt, "changedAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    if (passwordHash.isBlank()) {
      throw new IllegalArgumentException("passwordHash must not be blank");
    }
  }

  /** Issues the first credential for a newly signed-up {@link User}. */
  public static Credential issue(UUID id, UUID userId, String passwordHash, Instant now) {
    return new Credential(id, userId, passwordHash, now, now, now);
  }
}
