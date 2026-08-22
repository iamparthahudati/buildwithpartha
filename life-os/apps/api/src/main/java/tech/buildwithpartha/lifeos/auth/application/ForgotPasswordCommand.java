package tech.buildwithpartha.lifeos.auth.application;

import java.util.Objects;

/** The forgot-password use case's input, already translated out of the HTTP request. */
public record ForgotPasswordCommand(String email, String clientAddress) {

  public ForgotPasswordCommand {
    Objects.requireNonNull(email, "email must not be null");
    Objects.requireNonNull(clientAddress, "clientAddress must not be null");
  }
}
