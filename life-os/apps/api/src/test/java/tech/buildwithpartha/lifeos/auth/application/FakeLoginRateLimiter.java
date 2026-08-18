package tech.buildwithpartha.lifeos.auth.application;

import tech.buildwithpartha.lifeos.auth.domain.LoginRateLimiter;

final class FakeLoginRateLimiter implements LoginRateLimiter {

  private final boolean allow;

  FakeLoginRateLimiter(boolean allow) {
    this.allow = allow;
  }

  @Override
  public boolean tryAcquire(String key) {
    return allow;
  }
}
