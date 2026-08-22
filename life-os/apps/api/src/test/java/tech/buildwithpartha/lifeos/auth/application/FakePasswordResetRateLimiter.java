package tech.buildwithpartha.lifeos.auth.application;

import tech.buildwithpartha.lifeos.auth.domain.PasswordResetRateLimiter;

final class FakePasswordResetRateLimiter implements PasswordResetRateLimiter {

  private final boolean allow;

  FakePasswordResetRateLimiter(boolean allow) {
    this.allow = allow;
  }

  @Override
  public boolean tryAcquire(String key) {
    return allow;
  }
}
