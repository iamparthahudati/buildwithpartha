package tech.buildwithpartha.lifeos.auth.application;

import tech.buildwithpartha.lifeos.auth.domain.ResendVerificationRateLimiter;

final class FakeResendVerificationRateLimiter implements ResendVerificationRateLimiter {

  private final boolean allow;

  FakeResendVerificationRateLimiter(boolean allow) {
    this.allow = allow;
  }

  @Override
  public boolean tryAcquire(String key) {
    return allow;
  }
}
