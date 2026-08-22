package tech.buildwithpartha.lifeos.auth.api;

/**
 * The one reset-password success response shape. No session is issued here — the caller logs in
 * again with the new password (LOS-0505), since every prior session was just revoked.
 */
public record ResetPasswordResponse(String status) {

  private static final String PASSWORD_RESET = "PASSWORD_RESET";

  public static ResetPasswordResponse passwordReset() {
    return new ResetPasswordResponse(PASSWORD_RESET);
  }
}
