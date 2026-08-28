package tech.buildwithpartha.lifeos.common.time;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;

class TimeSummaryContractTests {

  @Test
  void rejectsImpossibleFocusTotalsAndTimerState() {
    assertThatThrownBy(() -> new FocusTimeSummary(-1, 0, 0, false, null))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new FocusTimeSummary(0, -1, 0, false, null))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new FocusTimeSummary(0, 0, -1, false, null))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new FocusTimeSummary(10, 0, 11, false, null))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new FocusTimeSummary(0, 0, 0, false, "1:00"))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejectsInvalidCategoryAndTimeBlockTotals() {
    assertThatThrownBy(() -> new TimeBlockCategoryMinutes(null, 0))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> new TimeBlockCategoryMinutes(" ", 0))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new TimeBlockCategoryMinutes("Focus", -1))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new TimeBlockTimeSummary(-1, 0, List.of()))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new TimeBlockTimeSummary(0, -1, List.of()))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new TimeBlockTimeSummary(0, 0, null))
        .isInstanceOf(NullPointerException.class);
  }
}
