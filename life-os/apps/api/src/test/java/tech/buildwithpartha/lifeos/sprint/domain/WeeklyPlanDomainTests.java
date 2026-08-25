package tech.buildwithpartha.lifeos.sprint.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class WeeklyPlanDomainTests {
  @Test
  void rejectsInvalidCapacityItemAndOutcomeValues() {
    LocalDate date = LocalDate.parse("2027-01-04");
    assertThatIllegalArgumentException().isThrownBy(() -> new WeeklyPlanCapacity(date, -1));
    assertThatIllegalArgumentException().isThrownBy(() -> new WeeklyPlanCapacity(date, 1441));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> new WeeklyPlanOutcome(UUID.randomUUID(), " ", 0));
    assertThatIllegalArgumentException().isThrownBy(() -> item(-1));
    assertThatIllegalArgumentException().isThrownBy(() -> item(1441));
  }

  @Test
  void rejectsInvalidWeekIdentityShapes() {
    assertThatIllegalArgumentException()
        .isThrownBy(() -> plan(LocalDate.parse("2027-01-04"), 1, 1));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> plan(LocalDate.parse("2027-01-10"), 0, 1));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> plan(LocalDate.parse("2027-01-10"), 8, 1));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> plan(LocalDate.parse("2027-01-10"), 1, 0));
  }

  @Test
  void identifiesEveryIndependentWarningSource() {
    assertThat(summary(1, 0, 0).hasWarnings()).isTrue();
    assertThat(summary(0, 1, 0).hasWarnings()).isTrue();
    assertThat(summary(0, 0, 1).hasWarnings()).isTrue();
  }

  private static WeeklyPlanConflictSummary summary(
      int overlappingBlocks, int unscheduledItems, int outcomesWithoutItems) {
    return new WeeklyPlanConflictSummary(
        0, 0, 0, List.of(), overlappingBlocks, unscheduledItems, outcomesWithoutItems);
  }

  private static WeeklyPlanItem item(int minutes) {
    return new WeeklyPlanItem(
        UUID.randomUUID(),
        UUID.randomUUID(),
        Optional.empty(),
        Optional.empty(),
        minutes,
        0,
        "Task",
        "TO_DO");
  }

  private static WeeklyPlan plan(LocalDate endDate, int weekStartDay, int revision) {
    Instant now = Instant.parse("2027-01-01T00:00:00Z");
    return new WeeklyPlan(
        UUID.randomUUID(),
        UUID.randomUUID(),
        LocalDate.parse("2027-01-04"),
        endDate,
        "UTC",
        weekStartDay,
        revision,
        WeeklyPlanStatus.DRAFT,
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        List.of(),
        List.of(),
        List.of(),
        now,
        now,
        0L);
  }
}
