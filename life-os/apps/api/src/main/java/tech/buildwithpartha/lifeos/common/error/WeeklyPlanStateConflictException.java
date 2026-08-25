package tech.buildwithpartha.lifeos.common.error;

/** Expected conflict when a Weekly Plan lifecycle action is invalid for its current state. */
public final class WeeklyPlanStateConflictException extends CodedException {
  public WeeklyPlanStateConflictException(String message) {
    super(StandardErrorCodes.WEEKLY_PLAN_STATE_CONFLICT, message);
  }
}
