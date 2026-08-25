package tech.buildwithpartha.lifeos.goal.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public final class GoalDomainFixture {

  private GoalDomainFixture() {}

  public static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  public static final UUID OTHER_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
  public static final UUID GOAL_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
  public static final UUID CHECK_IN_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");
  public static final UUID LINK_ID = UUID.fromString("30000000-0000-0000-0000-000000000001");
  public static final UUID TARGET_ID = UUID.fromString("40000000-0000-0000-0000-000000000001");

  public static Goal samplePercentageGoal() {
    return new Goal(
        GOAL_ID,
        USER_ID,
        "Read 12 books",
        Optional.of("Annual reading goal"),
        "LEARNING",
        GoalProgressType.PERCENTAGE,
        Optional.of(BigDecimal.valueOf(100)),
        BigDecimal.valueOf(50),
        Optional.of("%"),
        Optional.of(LocalDate.of(2026, 12, 31)),
        GoalStatus.ACTIVE,
        CheckInCadence.MONTHLY,
        false,
        Instant.parse("2026-01-01T00:00:00Z"),
        Instant.parse("2026-01-01T00:00:00Z"),
        0L);
  }

  public static Goal sampleNumericGoal() {
    return new Goal(
        UUID.randomUUID(),
        USER_ID,
        "Save 10000 USD",
        Optional.empty(),
        "FINANCE",
        GoalProgressType.NUMERIC,
        Optional.of(BigDecimal.valueOf(10000)),
        BigDecimal.valueOf(2500),
        Optional.of("USD"),
        Optional.of(LocalDate.of(2026, 12, 31)),
        GoalStatus.ACTIVE,
        CheckInCadence.MONTHLY,
        false,
        Instant.parse("2026-01-01T00:00:00Z"),
        Instant.parse("2026-01-01T00:00:00Z"),
        0L);
  }

  public static Goal sampleMilestoneGoal() {
    return new Goal(
        UUID.randomUUID(),
        USER_ID,
        "Complete 4 product milestones",
        Optional.empty(),
        "WORK",
        GoalProgressType.MILESTONE,
        Optional.of(BigDecimal.valueOf(4)),
        BigDecimal.valueOf(2),
        Optional.of("milestones"),
        Optional.of(LocalDate.of(2026, 12, 31)),
        GoalStatus.ACTIVE,
        CheckInCadence.WEEKLY,
        false,
        Instant.parse("2026-01-01T00:00:00Z"),
        Instant.parse("2026-01-01T00:00:00Z"),
        0L);
  }

  public static Goal sampleBinaryGoal() {
    return new Goal(
        UUID.randomUUID(),
        USER_ID,
        "Launch portfolio website",
        Optional.of("Ship the personal website"),
        "CAREER",
        GoalProgressType.BINARY,
        Optional.of(BigDecimal.ONE),
        BigDecimal.ZERO,
        Optional.empty(),
        Optional.of(LocalDate.of(2026, 6, 30)),
        GoalStatus.NOT_STARTED,
        CheckInCadence.WEEKLY,
        false,
        Instant.parse("2026-01-01T00:00:00Z"),
        Instant.parse("2026-01-01T00:00:00Z"),
        0L);
  }

  public static GoalCheckIn sampleCheckIn(UUID goalId) {
    return new GoalCheckIn(
        CHECK_IN_ID,
        goalId,
        USER_ID,
        BigDecimal.valueOf(25),
        Optional.of("Halfway done"),
        Instant.parse("2026-02-01T10:00:00Z"),
        Instant.parse("2026-02-01T10:00:00Z"));
  }

  public static GoalLink sampleGoalLink(UUID goalId) {
    return new GoalLink(
        LINK_ID,
        goalId,
        USER_ID,
        GoalLinkTargetType.PROJECT,
        TARGET_ID,
        Instant.parse("2026-01-15T10:00:00Z"));
  }
}
