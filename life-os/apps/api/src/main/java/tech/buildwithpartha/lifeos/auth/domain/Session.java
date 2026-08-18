package tech.buildwithpartha.lifeos.auth.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The {@code public.user_sessions} row LOS-0505 issues at login. Only {@link #tokenHash} and {@link
 * #csrfSecretHash} are ever persisted; the raw session token travels solely inside the {@code
 * Set-Cookie} response header, and the raw CSRF token solely inside the one login response body
 * that mints it ({@code 06-SECURITY.md}: "Store only a hash of session ... tokens").
 *
 * <p>{@link #TTL} is a login-time engineering default, not a legally reviewed value: this product
 * has no "remember me" checkbox, so every session is issued for the same fixed duration.
 */
public record Session(
    UUID id,
    UUID userId,
    String tokenHash,
    String csrfSecretHash,
    Instant createdAt,
    Instant lastSeenAt,
    Instant expiresAt,
    Optional<Instant> revokedAt,
    Optional<String> deviceHint) {

  public static final Duration TTL = Duration.ofDays(30);

  public Session {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(tokenHash, "tokenHash must not be null");
    Objects.requireNonNull(csrfSecretHash, "csrfSecretHash must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(lastSeenAt, "lastSeenAt must not be null");
    Objects.requireNonNull(expiresAt, "expiresAt must not be null");
    Objects.requireNonNull(revokedAt, "revokedAt must not be null");
    Objects.requireNonNull(deviceHint, "deviceHint must not be null");
    if (tokenHash.isBlank()) {
      throw new IllegalArgumentException("tokenHash must not be blank");
    }
    if (csrfSecretHash.isBlank()) {
      throw new IllegalArgumentException("csrfSecretHash must not be blank");
    }
  }

  /**
   * Issues a brand-new session. Login always calls this rather than ever reusing an existing row —
   * the session-fixation defense named in the ticket's acceptance contract is exactly that a
   * caller's pre-existing (possibly attacker-supplied) session cookie is never adopted, only ever
   * replaced by a freshly minted one.
   */
  public static Session issue(
      UUID id,
      UUID userId,
      String tokenHash,
      String csrfSecretHash,
      Instant now,
      Optional<String> deviceHint) {
    return new Session(
        id,
        userId,
        tokenHash,
        csrfSecretHash,
        now,
        now,
        now.plus(TTL),
        Optional.empty(),
        deviceHint);
  }

  /** {@code true} when the session has not been revoked and has not yet expired at {@code now}. */
  public boolean isActive(Instant now) {
    return revokedAt.isEmpty() && now.isBefore(expiresAt);
  }
}
