package tech.buildwithpartha.lifeos.auth.application;

import java.util.Objects;

/** The parameters needed to process a verification-resend request. */
public record ResendVerificationCommand(String email, String clientAddress) {

  public ResendVerificationCommand {
    Objects.requireNonNull(email, "email must not be null");
    Objects.requireNonNull(clientAddress, "clientAddress must not be null");
  }
}
