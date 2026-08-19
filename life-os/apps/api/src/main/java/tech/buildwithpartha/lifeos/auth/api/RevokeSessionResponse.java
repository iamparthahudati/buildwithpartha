package tech.buildwithpartha.lifeos.auth.api;

public record RevokeSessionResponse(boolean revoked) {

  public static RevokeSessionResponse success() {
    return new RevokeSessionResponse(true);
  }
}
