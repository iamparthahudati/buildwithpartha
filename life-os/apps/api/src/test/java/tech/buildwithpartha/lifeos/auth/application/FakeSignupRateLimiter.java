package tech.buildwithpartha.lifeos.auth.application;

import tech.buildwithpartha.lifeos.auth.domain.SignupRateLimiter;

final class FakeSignupRateLimiter implements SignupRateLimiter {

  private final boolean allow;

  FakeSignupRateLimiter(boolean allow) {
    this.allow = allow;
  }

  @Override
  public boolean tryAcquire(String key) {
    return allow;
  }
}
