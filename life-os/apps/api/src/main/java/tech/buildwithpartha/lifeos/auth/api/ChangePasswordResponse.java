package tech.buildwithpartha.lifeos.auth.api;

public record ChangePasswordResponse(String status) {

  public static ChangePasswordResponse success() {
    return new ChangePasswordResponse("PASSWORD_CHANGED");
  }
}
