package tech.buildwithpartha.lifeos.timeblock.domain;

/** LifeOS domain status for a Time Block. */
public enum TimeBlockStatus {
  SCHEDULED,
  IN_PROGRESS,
  COMPLETED,
  CANCELLED;

  public boolean isTerminal() {
    return this == COMPLETED || this == CANCELLED;
  }

  public static TimeBlockStatus fromDbValue(String value) {
    if (value == null) {
      throw new IllegalArgumentException("TimeBlock status value must not be null");
    }
    try {
      return TimeBlockStatus.valueOf(value.trim().toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Unknown TimeBlock status: " + value, e);
    }
  }
}
