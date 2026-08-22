package tech.buildwithpartha.lifeos.auth.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * A port over {@code public.email_verification_tokens}, implemented in {@code auth.infrastructure}
 * with JPA.
 */
public interface EmailVerificationTokenRepository {

  EmailVerificationToken save(EmailVerificationToken token);

  Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

  /**
   * Atomically marks the token consumed, but only if it is still unconsumed ({@code UPDATE ...
   * WHERE consumed_at IS NULL}, not a read-then-write from the caller). Returns {@code true} when
   * this call is the one that consumed it, {@code false} when another call already had — the
   * single-use guarantee LOS-0504's acceptance contract names, safe under two concurrent requests
   * presenting the same token.
   */
  boolean consume(UUID tokenId, Instant consumedAt);
}
