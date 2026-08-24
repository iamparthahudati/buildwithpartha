package tech.buildwithpartha.lifeos.common.time;

/** Content-free Focus Session totals for one requested instant range. */
public record FocusTimeSummary(
    int actualFocusMinutes,
    int actualBreakMinutes,
    int unscheduledFocusMinutes,
    boolean sessionActive,
    String activeSessionTimerSummary) {

  public FocusTimeSummary {
    if (actualFocusMinutes < 0 || actualBreakMinutes < 0 || unscheduledFocusMinutes < 0) {
      throw new IllegalArgumentException("Focus time summary minutes must not be negative");
    }
    if (unscheduledFocusMinutes > actualFocusMinutes) {
      throw new IllegalArgumentException("Unscheduled focus minutes cannot exceed actual focus");
    }
    if (!sessionActive && activeSessionTimerSummary != null) {
      throw new IllegalArgumentException("An inactive summary cannot have an active timer");
    }
  }
}
