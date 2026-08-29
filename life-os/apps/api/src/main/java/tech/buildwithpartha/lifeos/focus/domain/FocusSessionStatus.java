package tech.buildwithpartha.lifeos.focus.domain;

/** Persisted lifecycle status for a Focus Session. */
public enum FocusSessionStatus {
  RUNNING,
  PAUSED,
  COMPLETED,
  CANCELLED;

  public boolean isActive() {
    return this == RUNNING || this == PAUSED;
  }

  public boolean isTerminal() {
    return this == COMPLETED || this == CANCELLED;
  }
}
