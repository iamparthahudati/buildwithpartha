package tech.buildwithpartha.lifeos.auth.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * A port over {@code public.user_sessions}, implemented in {@code auth.infrastructure} with JPA.
 */
public interface SessionRepository {

  Session save(Session session);

  Optional<Session> findByTokenHash(String tokenHash);

  Optional<Session> findById(UUID sessionId);

  /**
   * Returns every currently active (non-revoked and non-expired) session for the user, ordered most
   * recently seen first.
   */
  List<Session> findActiveSessionsByUserId(UUID userId, Instant now);

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

  /**
   * Revokes every active session belonging to the user EXCEPT the specified current session. Used
   * when changing passwords or clicking "Sign out of all other sessions".
   */
  int revokeAllOtherSessionsForUser(UUID userId, UUID currentSessionId, Instant revokedAt);
}
