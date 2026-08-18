package tech.buildwithpartha.lifeos.auth.domain;

/**
 * A port for minting a fresh {@link RawToken} for a single-use link (email verification now,
 * password reset later).
 *
 * <p>Implemented in {@code auth.infrastructure} with a CSPRNG and a fast cryptographic digest —
 * unlike a user-chosen password, a generated token is already maximum-entropy, so it needs no
 * deliberately slow hash such as Argon2id.
 */
public interface SecureTokenGenerator {

  RawToken generate();

  /**
   * Hashes a raw token value presented back by a caller (LOS-0504: the value from a verification
   * link), with the same deterministic digest {@link #generate()} used to compute {@link
   * RawToken#hash()} — a token is looked up by re-hashing and matching, never by decrypting a
   * stored value.
   */
  String hash(String rawValue);
}
