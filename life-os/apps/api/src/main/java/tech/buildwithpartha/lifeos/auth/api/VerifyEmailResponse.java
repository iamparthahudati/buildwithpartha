package tech.buildwithpartha.lifeos.auth.api;

/** The one email verification success response shape: the token was valid and unused. */
public record VerifyEmailResponse(String status) {

  private static final String VERIFIED = "VERIFIED";

  public static VerifyEmailResponse verified() {
    return new VerifyEmailResponse(VERIFIED);
  }
}
