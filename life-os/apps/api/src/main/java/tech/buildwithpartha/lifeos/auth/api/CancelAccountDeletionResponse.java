package tech.buildwithpartha.lifeos.auth.api;

/** The one cancel-deletion success response shape: the token was valid and unused. */
public record CancelAccountDeletionResponse(String status) {

  private static final String CANCELLED = "CANCELLED";

  public static CancelAccountDeletionResponse cancelled() {
    return new CancelAccountDeletionResponse(CANCELLED);
  }
}
