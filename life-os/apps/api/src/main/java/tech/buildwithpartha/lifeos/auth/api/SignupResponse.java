package tech.buildwithpartha.lifeos.auth.api;

/**
 * The one safe, generic signup response shape. Its content never depends on whether the email
 * already belonged to an account: {@code auth.application.SignupService} always returns normally
 * either way, so this type has no field that could leak that distinction.
 */
public record SignupResponse(String status) {

  private static final String PENDING_VERIFICATION = "PENDING_VERIFICATION";

  public static SignupResponse pendingVerification() {
    return new SignupResponse(PENDING_VERIFICATION);
  }
}
