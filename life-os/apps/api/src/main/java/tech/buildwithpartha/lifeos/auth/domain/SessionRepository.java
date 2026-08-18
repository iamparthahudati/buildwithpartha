package tech.buildwithpartha.lifeos.auth.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * A port over {@code public.user_sessions}, implemented in {@code auth.infrastructure} with JPA.
 */
public interface SessionRepository {

  Session save(Session session);

  Optional<Session> findByTokenHash(String tokenHash);

  /**
   * Atomically revokes one session, but only if it is not already revoked ({@code UPDATE ... WHERE
   * revoked_at IS NULL}, the same conditional-update shape {@code
   * EmailVerificationTokenRepository#consume} already established). Returns {@code true} when this
   * call is the one that revoked it, {@code false} when it was already revoked — logout treats both
   * outcomes as success, since the end state (a revoked session) is identical either way.
   */
  boolean revoke(UUID sessionId, Instant revokedAt);

  /**
   * Revokes every currently-active session for a user ("sign out all devices", {@code
   * 06-SECURITY.md}), including the one the caller is using right now. Returns the number of
   * sessions actually revoked.
   */
  int revokeAllForUser(UUID userId, Instant revokedAt);
}
