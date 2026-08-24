package tech.buildwithpartha.lifeos.focus.domain;

/** Idempotent Focus Session writes retained for the bounded retry window. */
public enum FocusSessionOperationType {
  START,
  PAUSE,
  RESUME,
  START_BREAK,
  RESUME_FOCUS,
  COMPLETE,
  CANCEL,
  RECORD_INTERRUPTION
}
