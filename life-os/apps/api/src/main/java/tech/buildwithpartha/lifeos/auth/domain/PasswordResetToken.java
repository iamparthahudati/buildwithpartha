package tech.buildwithpartha.lifeos.auth.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The {@code public.password_reset_tokens} row. Only {@link #tokenHash} is ever persisted; the raw
 * value travels solely inside the one outbound reset email ({@code 31-PRIVACY-DATA-LIFECYCLE.md}),
 * mirroring {@link EmailVerificationToken} exactly.
 *
 * <p>{@link #TTL} is a reset-time engineering default, not yet a legally reviewed value: one hour
 * is deliberately shorter than email verification's 24 hours — the ticket's own "single-use short
 * token" wording — since a reset link is both more sensitive (it changes account access) and meant
 * to be used within minutes of being requested, not days later.
 */
public record PasswordResetToken(
    UUID id,
    UUID userId,
    String tokenHash,
    Instant expiresAt,
    Optional<Instant> consumedAt,
    Instant createdAt) {

  public static final Duration TTL = Duration.ofHours(1);

  public PasswordResetToken {
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

  public static PasswordResetToken issue(UUID id, UUID userId, String tokenHash, Instant now) {
    return new PasswordResetToken(id, userId, tokenHash, now.plus(TTL), Optional.empty(), now);
  }
}
