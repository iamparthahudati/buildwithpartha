package tech.buildwithpartha.lifeos.task.application;

/** Counts for Task detail sections whose canonical records are loaded by separate APIs. */
public record TaskDetailCounts(
    long linkedTimeBlockCount,
    long focusSessionCount,
    long commentCount,
    long attachmentCount,
    long activityEventCount) {

  public static TaskDetailCounts empty() {
    return new TaskDetailCounts(0, 0, 0, 0, 0);
  }
}
