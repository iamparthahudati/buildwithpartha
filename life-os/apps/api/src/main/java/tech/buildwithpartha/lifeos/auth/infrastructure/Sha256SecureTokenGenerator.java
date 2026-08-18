package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;

/**
 * Generates a 256-bit CSPRNG value, URL-safe Base64-encoded without padding for {@link
 * RawToken#value()}, and hashes it with SHA-256 (hex, {@code sha256:}-prefixed to match the
 * convention {@code IdentitySchemaIT}'s own fixtures already use) for {@link RawToken#hash()}. A
 * generated token is already maximum-entropy, so — unlike a user-chosen password — a fast digest is
 * the correct, standard choice; a deliberately slow hash such as Argon2id would only cost CPU here.
 */
@Component
class Sha256SecureTokenGenerator implements SecureTokenGenerator {

  private static final int TOKEN_BYTES = 32;
  private static final String HASH_PREFIX = "sha256:";

  private final SecureRandom secureRandom = new SecureRandom();

  @Override
  public RawToken generate() {
    byte[] randomBytes = new byte[TOKEN_BYTES];
    secureRandom.nextBytes(randomBytes);
    String value = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    return RawToken.of(value, hash(value));
  }

  @Override
  public String hash(String rawValue) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashed = digest.digest(rawValue.getBytes(StandardCharsets.UTF_8));
      return HASH_PREFIX + HexFormat.of().formatHex(hashed);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 must be available on every supported JVM", e);
    }
  }
}
