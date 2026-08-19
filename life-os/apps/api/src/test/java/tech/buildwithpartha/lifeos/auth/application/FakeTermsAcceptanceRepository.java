package tech.buildwithpartha.lifeos.auth.application;

import java.util.ArrayList;
import java.util.List;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptance;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptanceRepository;

final class FakeTermsAcceptanceRepository implements TermsAcceptanceRepository {

  private final List<TermsAcceptance> saved = new ArrayList<>();

  @Override
  public TermsAcceptance save(TermsAcceptance acceptance) {
    saved.add(acceptance);
    return acceptance;
  }

  @Override
  public List<TermsAcceptance> findByUserId(java.util.UUID userId) {
    return saved.stream().filter(t -> t.userId().equals(userId)).toList();
  }

  List<TermsAcceptance> all() {
    return List.copyOf(saved);
  }
}
