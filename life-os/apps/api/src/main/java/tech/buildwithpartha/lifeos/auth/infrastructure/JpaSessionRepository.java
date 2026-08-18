package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;

@Component
class JpaSessionRepository implements SessionRepository {

  private final SessionJpaRepository jpaRepository;

  JpaSessionRepository(SessionJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public Session save(Session session) {
    return toDomain(jpaRepository.save(toEntity(session)));
  }

  @Override
  public Optional<Session> findByTokenHash(String tokenHash) {
    return jpaRepository.findByTokenHash(tokenHash).map(JpaSessionRepository::toDomain);
  }

  @Override
  public boolean revoke(UUID sessionId, Instant revokedAt) {
    return jpaRepository.revokeIfActive(sessionId, revokedAt) == 1;
  }

  @Override
  public int revokeAllForUser(UUID userId, Instant revokedAt) {
    return jpaRepository.revokeAllForUser(userId, revokedAt);
  }

  private static SessionEntity toEntity(Session session) {
    return new SessionEntity(
        session.id(),
        session.userId(),
        session.tokenHash(),
        session.csrfSecretHash(),
        session.createdAt(),
        session.lastSeenAt(),
        session.expiresAt(),
        session.revokedAt().orElse(null),
        session.deviceHint().orElse(null));
  }

  private static Session toDomain(SessionEntity entity) {
    return new Session(
        entity.getId(),
        entity.getUserId(),
        entity.getTokenHash(),
        entity.getCsrfSecretHash(),
        entity.getCreatedAt(),
        entity.getLastSeenAt(),
        entity.getExpiresAt(),
        Optional.ofNullable(entity.getRevokedAt()),
        Optional.ofNullable(entity.getDeviceHint()));
  }
}
