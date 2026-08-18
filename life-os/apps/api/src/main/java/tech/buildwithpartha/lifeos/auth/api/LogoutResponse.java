package tech.buildwithpartha.lifeos.auth.api;

/**
 * The one logout response shape, returned whether there was an active session to revoke or not —
 * the caller's intent ("be logged out") is satisfied either way.
 */
public record LogoutResponse(String status) {

  private static final String LOGGED_OUT = "LOGGED_OUT";

  public static LogoutResponse loggedOut() {
    return new LogoutResponse(LOGGED_OUT);
  }
}
