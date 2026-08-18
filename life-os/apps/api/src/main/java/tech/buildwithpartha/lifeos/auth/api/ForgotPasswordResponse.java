package tech.buildwithpartha.lifeos.auth.api;

/**
 * The one safe forgot-password response shape. Its content never depends on whether the email
 * belongs to an active account, matching {@code SignupResponse}'s own enumeration-safety shape.
 */
public record ForgotPasswordResponse(String status) {

  private static final String REQUESTED = "REQUESTED";

  public static ForgotPasswordResponse requested() {
    return new ForgotPasswordResponse(REQUESTED);
  }
}
