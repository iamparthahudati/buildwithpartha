package tech.buildwithpartha.lifeos.user.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * User preferences aggregate holding onboarding lifecycle and planning defaults (LOS-0513,
 * 25-ONBOARDING-SPECIFICATION.md).
 */
public record UserPreferences(
    UUID id,
    UUID userId,
    int onboardingVersion,
    OnboardingStatus onboardingStatus,
    Optional<OnboardingStep> lastCompletedStep,
    Optional<Instant> onboardingCompletedAt,
    PlanningDefaults planningDefaults,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static final int CURRENT_ONBOARDING_VERSION = 1;

  public UserPreferences {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(onboardingStatus, "onboardingStatus must not be null");
    Objects.requireNonNull(lastCompletedStep, "lastCompletedStep must not be null");
    Objects.requireNonNull(onboardingCompletedAt, "onboardingCompletedAt must not be null");
    Objects.requireNonNull(planningDefaults, "planningDefaults must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
  }

  public static UserPreferences createDefault(UUID userId, Instant now) {
    return new UserPreferences(
        UUID.randomUUID(),
        userId,
        CURRENT_ONBOARDING_VERSION,
        OnboardingStatus.NOT_STARTED,
        Optional.empty(),
        Optional.empty(),
        PlanningDefaults.standardDefaults(),
        now,
        now,
        0L);
  }

  public UserPreferences advanceStep(OnboardingStep step, Instant now) {
    OnboardingStatus newStatus =
        onboardingStatus == OnboardingStatus.COMPLETED
            ? OnboardingStatus.COMPLETED
            : OnboardingStatus.IN_PROGRESS;
    return new UserPreferences(
        id,
        userId,
        onboardingVersion,
        newStatus,
        Optional.of(step),
        onboardingCompletedAt,
        planningDefaults,
        createdAt,
        now,
        version);
  }

  public UserPreferences complete(Instant now) {
    return new UserPreferences(
        id,
        userId,
        onboardingVersion,
        OnboardingStatus.COMPLETED,
        Optional.of(OnboardingStep.START),
        Optional.of(now),
        planningDefaults,
        createdAt,
        now,
        version);
  }

  public UserPreferences updatePlanningDefaults(PlanningDefaults newDefaults, Instant now) {
    return new UserPreferences(
        id,
        userId,
        onboardingVersion,
        onboardingStatus,
        lastCompletedStep,
        onboardingCompletedAt,
        newDefaults,
        createdAt,
        now,
        version);
  }
}
