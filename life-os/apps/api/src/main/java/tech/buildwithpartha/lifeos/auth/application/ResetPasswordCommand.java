package tech.buildwithpartha.lifeos.auth.application;

import java.util.Objects;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/** The reset-password use case's input, already translated out of the HTTP request. */
public record ResetPasswordCommand(String token, RawPassword newPassword) {

  public ResetPasswordCommand {
    Objects.requireNonNull(token, "token must not be null");
    Objects.requireNonNull(newPassword, "newPassword must not be null");
  }
}
