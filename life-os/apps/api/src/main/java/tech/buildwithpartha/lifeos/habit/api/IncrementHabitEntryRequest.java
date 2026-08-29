package tech.buildwithpartha.lifeos.habit.api;

import jakarta.validation.constraints.Positive;
import java.time.LocalDate;

/**
 * Request body for recording a completion. {@code by} defaults to 1 when omitted; {@code date}
 * defaults to the habit's own "today" when omitted (LOS-1209).
 */
public record IncrementHabitEntryRequest(
    @Positive(message = "INVALID") Integer by, LocalDate date) {

  public int byOrDefault() {
    return by == null ? 1 : by;
  }
}
