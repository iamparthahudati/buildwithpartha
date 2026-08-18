package tech.buildwithpartha.lifeos.auth.application;

import java.util.Objects;

/** The email verification use case's input, already translated out of the HTTP request. */
public record VerifyEmailCommand(String token) {

  public VerifyEmailCommand {
    Objects.requireNonNull(token, "token must not be null");
  }
}
