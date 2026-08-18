package tech.buildwithpartha.lifeos.auth.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The {@code public.email_verification_tokens} row. Only {@link #tokenHash} is ever persisted; the
 * raw value travels solely inside the one outbound verification email ({@code
 * 31-PRIVACY-DATA-LIFECYCLE.md}).
 *
 * <p>{@link #TTL} is a signup-time engineering default, not yet a legally reviewed value: 24 hours
 * gives a realistic window to check email without the friction of a much shorter, reset-token-style
 * expiry, while still falling well inside R1's "purge expired/consumed records within 7 days"
 * retention class. Consuming the token is LOS-0504's job; this ticket only issues it.
 */
public record EmailVerificationToken(
    UUID id,
    UUID userId,
    String tokenHash,
    Instant expiresAt,
    Optional<Instant> consumedAt,
    Instant createdAt) {

  public static final Duration TTL = Duration.ofHours(24);

  public EmailVerificationToken {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(tokenHash, "tokenHash must not be null");
    Objects.requireNonNull(expiresAt, "expiresAt must not be null");
    Objects.requireNonNull(consumedAt, "consumedAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    if (tokenHash.isBlank()) {
      throw new IllegalArgumentException("tokenHash must not be blank");
    }
  }

  public static EmailVerificationToken issue(UUID id, UUID userId, String tokenHash, Instant now) {
    return new EmailVerificationToken(id, userId, tokenHash, now.plus(TTL), Optional.empty(), now);
  }
}
