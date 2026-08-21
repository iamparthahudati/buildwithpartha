package tech.buildwithpartha.lifeos.auth.application;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;

final class FakeSessionRepository implements SessionRepository {

  private final List<Session> saved = new ArrayList<>();

  @Override
  public Session save(Session session) {
    saved.add(session);
    return session;
  }

  @Override
  public Optional<Session> findByTokenHash(String tokenHash) {
    return saved.stream().filter(session -> session.tokenHash().equals(tokenHash)).findFirst();
  }

  @Override
  public Optional<Session> findById(UUID sessionId) {
    return saved.stream().filter(session -> session.id().equals(sessionId)).findFirst();
  }

  @Override
  public List<Session> findActiveSessionsByUserId(UUID userId, Instant now) {
    return saved.stream()
        .filter(session -> session.userId().equals(userId) && session.isActive(now))
        .sorted(Comparator.comparing(Session::lastSeenAt).reversed())
        .toList();
  }

  @Override
  public boolean revoke(UUID sessionId, Instant revokedAt) {
    for (int i = 0; i < saved.size(); i++) {
      Session session = saved.get(i);
      if (session.id().equals(sessionId)) {
        if (session.revokedAt().isPresent()) {
          return false;
        }
        saved.set(i, withRevokedAt(session, revokedAt));
        return true;
      }
    }
    return false;
  }

  @Override
  public int revokeAllForUser(UUID userId, Instant revokedAt) {
    int revokedCount = 0;
    for (int i = 0; i < saved.size(); i++) {
      Session session = saved.get(i);
      if (session.userId().equals(userId) && session.revokedAt().isEmpty()) {
        saved.set(i, withRevokedAt(session, revokedAt));
        revokedCount++;
      }
    }
    return revokedCount;
  }

  @Override
  public int revokeAllOtherSessionsForUser(UUID userId, UUID currentSessionId, Instant revokedAt) {
    int revokedCount = 0;
    for (int i = 0; i < saved.size(); i++) {
      Session session = saved.get(i);
      if (session.userId().equals(userId)
          && !session.id().equals(currentSessionId)
          && session.revokedAt().isEmpty()) {
        saved.set(i, withRevokedAt(session, revokedAt));
        revokedCount++;
      }
    }
    return revokedCount;
  }

  @Override
  public boolean rotateCsrfSecret(UUID sessionId, String csrfSecretHash, Instant lastSeenAt) {
    for (int i = 0; i < saved.size(); i++) {
      Session session = saved.get(i);
      if (session.id().equals(sessionId) && session.revokedAt().isEmpty()) {
        saved.set(
            i,
            new Session(
                session.id(),
                session.userId(),
                session.tokenHash(),
                csrfSecretHash,
                session.createdAt(),
                lastSeenAt,
                session.expiresAt(),
                session.revokedAt(),
                session.deviceHint()));
        return true;
      }
    }
    return false;
  }

  List<Session> all() {
    return List.copyOf(saved);
  }

  private static Session withRevokedAt(Session session, Instant revokedAt) {
    return new Session(
        session.id(),
        session.userId(),
        session.tokenHash(),
        session.csrfSecretHash(),
        session.createdAt(),
        session.lastSeenAt(),
        session.expiresAt(),
        Optional.of(revokedAt),
        session.deviceHint());
  }
}
