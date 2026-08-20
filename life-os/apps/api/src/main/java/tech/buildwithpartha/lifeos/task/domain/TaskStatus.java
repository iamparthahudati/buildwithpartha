package tech.buildwithpartha.lifeos.task.domain;

/** Status enum for tasks matching LifeOS product vocabulary. */
public enum TaskStatus {
  TO_DO,
  IN_PROGRESS,
  BLOCKED,
  DONE,
  CANCELLED;

  public boolean isOpen() {
    return this == TO_DO || this == IN_PROGRESS || this == BLOCKED;
  }

  public boolean isTerminal() {
    return this == DONE || this == CANCELLED;
  }
}
