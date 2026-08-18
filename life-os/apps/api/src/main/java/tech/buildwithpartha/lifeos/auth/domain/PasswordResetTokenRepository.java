package tech.buildwithpartha.lifeos.auth.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * A port over {@code public.password_reset_tokens}, implemented in {@code auth.infrastructure} with
 * JPA.
 */
public interface PasswordResetTokenRepository {

  PasswordResetToken save(PasswordResetToken token);

  Optional<PasswordResetToken> findByTokenHash(String tokenHash);

  /**
   * Atomically marks the token consumed, but only if it is still unconsumed, the same {@code UPDATE
   * ... WHERE consumed_at IS NULL} single-use guard {@link
   * EmailVerificationTokenRepository#consume} already established.
   */
  boolean consume(UUID tokenId, Instant consumedAt);
}
