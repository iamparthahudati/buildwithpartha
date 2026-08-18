package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.util.Optional;
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
