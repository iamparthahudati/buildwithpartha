package tech.buildwithpartha.lifeos.goal.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class GoalDomainTests {

  @Nested
  @DisplayName("Goal Invariant Tests")
  class GoalInvariantTests {

    @Test
    void validGoalIsCreatedSuccessfully() {
      Goal goal = GoalDomainFixture.samplePercentageGoal();

      assertThat(goal.id()).isEqualTo(GoalDomainFixture.GOAL_ID);
      assertThat(goal.title()).isEqualTo("Read 12 books");
      assertThat(goal.category()).isEqualTo("LEARNING");
      assertThat(goal.progressType()).isEqualTo(GoalProgressType.PERCENTAGE);
      assertThat(goal.status()).isEqualTo(GoalStatus.ACTIVE);
      assertThat(goal.checkInCadence()).isEqualTo(CheckInCadence.MONTHLY);
      assertThat(goal.isOwnedBy(GoalDomainFixture.USER_ID)).isTrue();
      assertThat(goal.isOwnedBy(GoalDomainFixture.OTHER_USER_ID)).isFalse();
    }

    @Test
    void throwsExceptionWhenTitleIsBlank() {
      assertThatThrownBy(
              () ->
                  new Goal(
                      UUID.randomUUID(),
                      GoalDomainFixture.USER_ID,
                      "   ",
                      Optional.empty(),
                      "WORK",
                      GoalProgressType.PERCENTAGE,
                      Optional.of(BigDecimal.valueOf(100)),
                      BigDecimal.ZERO,
                      Optional.empty(),
                      Optional.empty(),
                      GoalStatus.ACTIVE,
                      CheckInCadence.NONE,
                      false,
                      Instant.now(),
                      Instant.now(),
                      0L))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("Goal title must not be blank");
    }

    @Test
    void throwsExceptionWhenCategoryIsBlank() {
      assertThatThrownBy(
              () ->
                  new Goal(
                      UUID.randomUUID(),
                      GoalDomainFixture.USER_ID,
                      "Valid Title",
                      Optional.empty(),
                      "",
                      GoalProgressType.PERCENTAGE,
                      Optional.of(BigDecimal.valueOf(100)),
                      BigDecimal.ZERO,
                      Optional.empty(),
                      Optional.empty(),
                      GoalStatus.ACTIVE,
                      CheckInCadence.NONE,
                      false,
                      Instant.now(),
                      Instant.now(),
                      0L))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("Goal category must not be blank");
    }

    @Test
    void throwsExceptionWhenCurrentValueIsNegative() {
      assertThatThrownBy(
              () ->
                  new Goal(
                      UUID.randomUUID(),
                      GoalDomainFixture.USER_ID,
                      "Valid Title",
                      Optional.empty(),
                      "HEALTH",
                      GoalProgressType.PERCENTAGE,
                      Optional.of(BigDecimal.valueOf(100)),
                      BigDecimal.valueOf(-1),
                      Optional.empty(),
                      Optional.empty(),
                      GoalStatus.ACTIVE,
                      CheckInCadence.NONE,
                      false,
                      Instant.now(),
                      Instant.now(),
                      0L))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("Goal currentValue must not be negative");
    }

    @Test
    void throwsExceptionWhenTargetValueIsZeroOrNegative() {
      assertThatThrownBy(
              () ->
                  new Goal(
                      UUID.randomUUID(),
                      GoalDomainFixture.USER_ID,
                      "Valid Title",
                      Optional.empty(),
                      "HEALTH",
                      GoalProgressType.NUMERIC,
                      Optional.of(BigDecimal.ZERO),
                      BigDecimal.ZERO,
                      Optional.empty(),
                      Optional.empty(),
                      GoalStatus.ACTIVE,
                      CheckInCadence.NONE,
                      false,
                      Instant.now(),
                      Instant.now(),
                      0L))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("Goal targetValue must be positive");
    }

    @Test
    void throwsExceptionWhenNumericGoalHasNoTargetValue() {
      assertThatThrownBy(
              () ->
                  new Goal(
                      UUID.randomUUID(),
                      GoalDomainFixture.USER_ID,
                      "Valid Title",
                      Optional.empty(),
                      "HEALTH",
                      GoalProgressType.NUMERIC,
                      Optional.empty(),
                      BigDecimal.ZERO,
                      Optional.empty(),
                      Optional.empty(),
                      GoalStatus.ACTIVE,
                      CheckInCadence.NONE,
                      false,
                      Instant.now(),
                      Instant.now(),
                      0L))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("NUMERIC goals require a targetValue");
    }
  }

  @Nested
  @DisplayName("Progress Calculation Invariants")
  class ProgressCalculationTests {

    @Test
    void calculatesPercentageProgressCorrectly() {
      Goal goal = GoalDomainFixture.samplePercentageGoal();
      assertThat(goal.calculateProgressPercentage()).isEqualTo(new BigDecimal("50.00"));
    }

    @Test
    void calculatesNumericProgressCorrectly() {
      Goal goal = GoalDomainFixture.sampleNumericGoal();
      assertThat(goal.calculateProgressPercentage()).isEqualTo(new BigDecimal("25.00"));
    }

    @Test
    void calculatesMilestoneProgressCorrectly() {
      Goal goal = GoalDomainFixture.sampleMilestoneGoal();
      assertThat(goal.calculateProgressPercentage()).isEqualTo(new BigDecimal("50.00"));
    }

    @Test
    void calculatesBinaryProgressCorrectly() {
      Goal unachievedBinary = GoalDomainFixture.sampleBinaryGoal();
      assertThat(unachievedBinary.calculateProgressPercentage()).isEqualTo(new BigDecimal("0.00"));

      Goal achievedBinary =
          new Goal(
              unachievedBinary.id(),
              unachievedBinary.userId(),
              unachievedBinary.title(),
              unachievedBinary.description(),
              unachievedBinary.category(),
              unachievedBinary.progressType(),
              unachievedBinary.targetValue(),
              BigDecimal.ONE,
              unachievedBinary.unit(),
              unachievedBinary.targetDate(),
              GoalStatus.COMPLETED,
              unachievedBinary.checkInCadence(),
              unachievedBinary.archived(),
              unachievedBinary.createdAt(),
              unachievedBinary.updatedAt(),
              unachievedBinary.version());

      assertThat(achievedBinary.calculateProgressPercentage()).isEqualTo(new BigDecimal("100.00"));
      assertThat(achievedBinary.isCompleted()).isTrue();
    }

    @Test
    void clampsOverachievedProgressTo100Percent() {
      Goal overachieved =
          new Goal(
              UUID.randomUUID(),
              GoalDomainFixture.USER_ID,
              "Overachieved Goal",
              Optional.empty(),
              "WORK",
              GoalProgressType.NUMERIC,
              Optional.of(BigDecimal.valueOf(10)),
              BigDecimal.valueOf(15),
              Optional.empty(),
              Optional.empty(),
              GoalStatus.ACTIVE,
              CheckInCadence.WEEKLY,
              false,
              Instant.now(),
              Instant.now(),
              0L);

      assertThat(overachieved.calculateProgressPercentage()).isEqualTo(new BigDecimal("100.00"));
    }
  }

  @Nested
  @DisplayName("GoalCheckIn and GoalLink Invariants")
  class RelatedEntityTests {

    @Test
    void goalCheckInInvariantsHold() {
      GoalCheckIn checkIn = GoalDomainFixture.sampleCheckIn(GoalDomainFixture.GOAL_ID);

      assertThat(checkIn.id()).isEqualTo(GoalDomainFixture.CHECK_IN_ID);
      assertThat(checkIn.goalId()).isEqualTo(GoalDomainFixture.GOAL_ID);
      assertThat(checkIn.value()).isEqualTo(BigDecimal.valueOf(25));
      assertThat(checkIn.isOwnedBy(GoalDomainFixture.USER_ID)).isTrue();
      assertThat(checkIn.isOwnedBy(GoalDomainFixture.OTHER_USER_ID)).isFalse();
    }

    @Test
    void goalCheckInThrowsOnNegativeValue() {
      assertThatThrownBy(
              () ->
                  new GoalCheckIn(
                      UUID.randomUUID(),
                      GoalDomainFixture.GOAL_ID,
                      GoalDomainFixture.USER_ID,
                      BigDecimal.valueOf(-5),
                      Optional.empty(),
                      Instant.now(),
                      Instant.now()))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("GoalCheckIn value must not be negative");
    }

    @Test
    void goalLinkInvariantsHold() {
      GoalLink link = GoalDomainFixture.sampleGoalLink(GoalDomainFixture.GOAL_ID);

      assertThat(link.id()).isEqualTo(GoalDomainFixture.LINK_ID);
      assertThat(link.goalId()).isEqualTo(GoalDomainFixture.GOAL_ID);
      assertThat(link.targetType()).isEqualTo(GoalLinkTargetType.PROJECT);
      assertThat(link.targetId()).isEqualTo(GoalDomainFixture.TARGET_ID);
      assertThat(link.isOwnedBy(GoalDomainFixture.USER_ID)).isTrue();
    }

    @Test
    @DisplayName(
        "Carrier Invariants: GoalQuery, GoalSummaryCounts, GoalQueryResult, UpdateGoalCommand")
    void carrierInvariants() {
      assertThatThrownBy(
              () ->
                  new tech.buildwithpartha.lifeos.goal.application.UpdateGoalCommand(
                      "Title",
                      Optional.empty(),
                      "WORK",
                      GoalProgressType.PERCENTAGE,
                      Optional.empty(),
                      BigDecimal.ZERO,
                      Optional.empty(),
                      Optional.empty(),
                      CheckInCadence.NONE,
                      -1L))
          .isInstanceOf(IllegalArgumentException.class);

      assertThatThrownBy(
              () ->
                  new GoalQuery(
                      GoalDomainFixture.USER_ID,
                      null,
                      null,
                      null,
                      null,
                      null,
                      -1,
                      20,
                      "title",
                      "ASC"))
          .isInstanceOf(IllegalArgumentException.class);

      assertThatThrownBy(
              () ->
                  new GoalQuery(
                      GoalDomainFixture.USER_ID,
                      null,
                      null,
                      null,
                      null,
                      null,
                      0,
                      0,
                      "title",
                      "ASC"))
          .isInstanceOf(IllegalArgumentException.class);

      assertThatThrownBy(
              () ->
                  new GoalQuery(
                      GoalDomainFixture.USER_ID,
                      null,
                      null,
                      null,
                      null,
                      null,
                      0,
                      150,
                      "title",
                      "ASC"))
          .isInstanceOf(IllegalArgumentException.class);

      assertThatThrownBy(() -> new GoalSummaryCounts(-1, 0, 0, 0, 0))
          .isInstanceOf(IllegalArgumentException.class);

      assertThatThrownBy(() -> new GoalQueryResult(java.util.List.of(), -1))
          .isInstanceOf(IllegalArgumentException.class);
    }
  }
}
