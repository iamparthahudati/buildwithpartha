package tech.buildwithpartha.lifeos.auth.application;

import java.util.Objects;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/**
 * The signup use case's input, already translated out of the HTTP request by {@code auth.api}. The
 * password arrives pre-wrapped as {@link RawPassword} so a bare {@code String} plaintext never
 * exists past the controller boundary.
 */
public record SignupCommand(
    String email,
    RawPassword rawPassword,
    String displayName,
    String termsVersion,
    String privacyVersion,
    String clientAddress) {

  public SignupCommand {
    Objects.requireNonNull(email, "email must not be null");
    Objects.requireNonNull(rawPassword, "rawPassword must not be null");
    Objects.requireNonNull(displayName, "displayName must not be null");
    Objects.requireNonNull(termsVersion, "termsVersion must not be null");
    Objects.requireNonNull(privacyVersion, "privacyVersion must not be null");
    Objects.requireNonNull(clientAddress, "clientAddress must not be null");
  }
}
