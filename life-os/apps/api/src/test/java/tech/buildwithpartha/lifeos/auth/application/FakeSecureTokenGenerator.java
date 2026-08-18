package tech.buildwithpartha.lifeos.auth.application;

import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;

final class FakeSecureTokenGenerator implements SecureTokenGenerator {

  private final RawToken token;

  FakeSecureTokenGenerator(RawToken token) {
    this.token = token;
  }

  @Override
  public RawToken generate() {
    return token;
  }
}
