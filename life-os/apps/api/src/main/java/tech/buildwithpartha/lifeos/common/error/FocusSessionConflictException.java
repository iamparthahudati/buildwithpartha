package tech.buildwithpartha.lifeos.common.error;

/** Expected Focus Session lifecycle conflict mapped to HTTP 409. */
public final class FocusSessionConflictException extends CodedException {

  private FocusSessionConflictException(ErrorCode code, String message) {
    super(code, message);
  }

  public static FocusSessionConflictException alreadyActive() {
    return new FocusSessionConflictException(
        StandardErrorCodes.FOCUS_SESSION_ALREADY_ACTIVE,
        "The Account already has an active Focus Session");
  }

  public static FocusSessionConflictException invalidState(String message) {
    return new FocusSessionConflictException(
        StandardErrorCodes.FOCUS_SESSION_STATE_CONFLICT, message);
  }

  public static FocusSessionConflictException reusedIdempotencyKey() {
    return new FocusSessionConflictException(
        StandardErrorCodes.IDEMPOTENCY_KEY_REUSED,
        "The idempotency key is already bound to another operation");
  }
}
