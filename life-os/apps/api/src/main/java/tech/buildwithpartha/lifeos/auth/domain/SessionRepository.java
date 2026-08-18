package tech.buildwithpartha.lifeos.auth.domain;

import java.util.Optional;

/**
 * A port over {@code public.user_sessions}, implemented in {@code auth.infrastructure} with JPA.
 */
public interface SessionRepository {

  Session save(Session session);

  Optional<Session> findByTokenHash(String tokenHash);
}
