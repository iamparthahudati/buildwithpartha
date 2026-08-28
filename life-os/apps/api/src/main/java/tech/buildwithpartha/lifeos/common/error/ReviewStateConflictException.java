package tech.buildwithpartha.lifeos.common.error;

/** Expected conflict when a Review lifecycle action is invalid for its current state. */
public final class ReviewStateConflictException extends CodedException {
  public ReviewStateConflictException(String message) {
    super(StandardErrorCodes.REVIEW_STATE_CONFLICT, message);
  }
}
