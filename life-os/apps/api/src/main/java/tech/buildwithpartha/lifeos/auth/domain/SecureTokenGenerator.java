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
}
