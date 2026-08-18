package tech.buildwithpartha.lifeos.auth.application;

import java.util.ArrayList;
import java.util.List;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;

final class FakeCredentialRepository implements CredentialRepository {

  private final List<Credential> saved = new ArrayList<>();

  @Override
  public Credential save(Credential credential) {
    saved.add(credential);
    return credential;
  }

  List<Credential> all() {
    return List.copyOf(saved);
  }
}
