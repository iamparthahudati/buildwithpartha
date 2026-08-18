package tech.buildwithpartha.lifeos.auth.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
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

  List<Session> all() {
    return List.copyOf(saved);
  }
}
