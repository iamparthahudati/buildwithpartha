package tech.buildwithpartha.lifeos.auth.api;

/**
 * The safe, generic resend-verification response shape. Its content never depends on whether the
 * email belongs to an unverified account: {@code auth.application.ResendVerificationService} always
 * returns normally either way, preventing account enumeration.
 */
public record ResendVerificationResponse(String status) {

  private static final String PENDING_VERIFICATION = "PENDING_VERIFICATION";

  public static ResendVerificationResponse pendingVerification() {
    return new ResendVerificationResponse(PENDING_VERIFICATION);
  }
}
