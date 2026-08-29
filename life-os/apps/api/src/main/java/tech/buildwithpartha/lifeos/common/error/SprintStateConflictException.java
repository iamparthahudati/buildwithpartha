package tech.buildwithpartha.lifeos.common.error;

/** Expected conflict when a Sprint lifecycle action is not valid for its current state. */
public final class SprintStateConflictException extends CodedException {
  public SprintStateConflictException(String message) {
    super(StandardErrorCodes.SPRINT_STATE_CONFLICT, message);
  }
}
