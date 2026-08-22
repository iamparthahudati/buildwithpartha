package tech.buildwithpartha.lifeos.auth.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;

final class FakeCredentialRepository implements CredentialRepository {

  private final List<Credential> saved = new ArrayList<>();

  @Override
  public Credential save(Credential credential) {
    saved.add(credential);
    return credential;
  }

  @Override
  public Optional<Credential> findByUserId(UUID userId) {
    // Last write wins, matching a real row's current state after repeated saves.
    Credential latest = null;
    for (Credential credential : saved) {
      if (credential.userId().equals(userId)) {
        latest = credential;
      }
    }
    return Optional.ofNullable(latest);
  }

  List<Credential> all() {
    return List.copyOf(saved);
  }
}
