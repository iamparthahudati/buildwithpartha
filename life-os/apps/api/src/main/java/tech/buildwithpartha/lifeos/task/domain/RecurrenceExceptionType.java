package tech.buildwithpartha.lifeos.task.domain;

/** Type of exception for a specific occurrence date in a recurring series. */
public enum RecurrenceExceptionType {
  SKIPPED,
  RESCHEDULED,
  DELETED,
  OVERRIDDEN
}
