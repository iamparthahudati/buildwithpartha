package tech.buildwithpartha.lifeos.auth.application;

import java.util.Objects;
import java.util.Optional;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/** The login use case's input, already translated out of the HTTP request by {@code auth.api}. */
public record LoginCommand(
    String email, RawPassword rawPassword, String clientAddress, Optional<String> deviceHint) {

  public LoginCommand {
    Objects.requireNonNull(email, "email must not be null");
    Objects.requireNonNull(rawPassword, "rawPassword must not be null");
    Objects.requireNonNull(clientAddress, "clientAddress must not be null");
    Objects.requireNonNull(deviceHint, "deviceHint must not be null");
  }
}
