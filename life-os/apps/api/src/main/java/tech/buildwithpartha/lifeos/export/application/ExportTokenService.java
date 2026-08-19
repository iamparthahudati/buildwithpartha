package tech.buildwithpartha.lifeos.export.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import org.springframework.stereotype.Component;

/**
 * Generates cryptographically secure random download tokens and their SHA-256 hashes.
 */
@Component
public class ExportTokenService {

  private static final int TOKEN_BYTE_LENGTH = 32;
  private final SecureRandom secureRandom = new SecureRandom();

  /**
   * Generates a new cryptographically random 32-byte hex-encoded download token.
   */
  public String generateToken() {
    byte[] bytes = new byte[TOKEN_BYTE_LENGTH];
    secureRandom.nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }

  /**
   * Computes the SHA-256 hash of a raw download token.
   */
  public String hashToken(String rawToken) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hashBytes);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 message digest algorithm unavailable", e);
    }
  }
}
