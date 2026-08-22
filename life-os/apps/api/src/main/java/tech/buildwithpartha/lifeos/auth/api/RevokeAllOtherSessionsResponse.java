package tech.buildwithpartha.lifeos.auth.api;

public record RevokeAllOtherSessionsResponse(int revokedCount) {

  public static RevokeAllOtherSessionsResponse of(int revokedCount) {
    return new RevokeAllOtherSessionsResponse(revokedCount);
  }
}
