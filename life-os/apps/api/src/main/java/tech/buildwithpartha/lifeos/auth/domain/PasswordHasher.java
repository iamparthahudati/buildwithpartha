package tech.buildwithpartha.lifeos.auth.domain;

/**
 * A port for turning a raw password into a stored hash and verifying it later, without the domain
 * knowing which algorithm or library is behind it.
 *
 * <p>Implemented in {@code auth.infrastructure} with Argon2id ({@code 06-SECURITY.md}).
 */
public interface PasswordHasher {

  String hash(RawPassword rawPassword);

  boolean matches(RawPassword rawPassword, String hash);

  /**
   * True when {@code hash} was produced with parameters weaker than this hasher's current target
   * parameters, meaning it should be replaced the next time the raw password is available (i.e. on
   * a successful login).
   */
  boolean needsRehash(String hash);
}
