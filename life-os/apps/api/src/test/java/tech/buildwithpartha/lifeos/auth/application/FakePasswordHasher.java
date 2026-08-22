package tech.buildwithpartha.lifeos.auth.application;

import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/**
 * A deterministic {@link PasswordHasher} test double. {@link #legacyHashFor(RawPassword)} lets a
 * test construct a stored hash that {@link #needsRehash(String)} reports as outdated, without
 * depending on the real Argon2 implementation in {@code auth.infrastructure}.
 */
final class FakePasswordHasher implements PasswordHasher {

  private static final String CURRENT_PREFIX = "hashed:";
  private static final String LEGACY_PREFIX = "legacy:";

  @Override
  public String hash(RawPassword rawPassword) {
    return CURRENT_PREFIX + rawPassword.value();
  }

  @Override
  public boolean matches(RawPassword rawPassword, String hash) {
    return hash.equals(CURRENT_PREFIX + rawPassword.value())
        || hash.equals(LEGACY_PREFIX + rawPassword.value());
  }

  @Override
  public boolean needsRehash(String hash) {
    return hash.startsWith(LEGACY_PREFIX);
  }

  static String legacyHashFor(RawPassword rawPassword) {
    return LEGACY_PREFIX + rawPassword.value();
  }
}
