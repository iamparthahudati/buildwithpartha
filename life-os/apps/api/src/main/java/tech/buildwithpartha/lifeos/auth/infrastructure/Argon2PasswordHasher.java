package tech.buildwithpartha.lifeos.auth.infrastructure;

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/**
 * Argon2id password hashing, the algorithm {@code 06-SECURITY.md} requires for identity
 * credentials.
 *
 * <p>Parameters are {@code Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()}: 16-byte salt,
 * 32-byte hash, parallelism 1, 16 MiB memory, 2 iterations (verified by decoding a sample hash:
 * {@code $argon2id$v=19$m=16384,t=2,p=1$...}) — in the range the OWASP Password Storage Cheat
 * Sheet's Argon2id guidance recommends, and the reviewed parameter set for this ticket (LOS-0502).
 * Each encoded hash embeds its own parameters, so {@link #needsRehash(String)} can detect an older
 * hash even after this configuration changes in a later review.
 */
@Component
class Argon2PasswordHasher implements PasswordHasher {

  private final Argon2PasswordEncoder encoder =
      Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();

  @Override
  public String hash(RawPassword rawPassword) {
    return encoder.encode(rawPassword.value());
  }

  @Override
  public boolean matches(RawPassword rawPassword, String hash) {
    return encoder.matches(rawPassword.value(), hash);
  }

  @Override
  public boolean needsRehash(String hash) {
    return encoder.upgradeEncoding(hash);
  }
}
