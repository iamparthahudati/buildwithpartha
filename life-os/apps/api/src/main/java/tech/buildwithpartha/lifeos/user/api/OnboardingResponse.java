package tech.buildwithpartha.lifeos.user.api;

import java.time.Instant;
import tech.buildwithpartha.lifeos.user.application.OnboardingSummary;
import tech.buildwithpartha.lifeos.user.domain.OnboardingStatus;
import tech.buildwithpartha.lifeos.user.domain.OnboardingStep;

public record OnboardingResponse(
    int onboardingVersion,
    OnboardingStatus onboardingStatus,
    OnboardingStep lastCompletedStep,
    Instant onboardingCompletedAt,
    OnboardingProfileDto profile,
    PlanningDefaultsDto planningDefaults) {

  public static OnboardingResponse fromSummary(OnboardingSummary summary) {
    return new OnboardingResponse(
        summary.preferences().onboardingVersion(),
        summary.preferences().onboardingStatus(),
        summary.preferences().lastCompletedStep().orElse(null),
        summary.preferences().onboardingCompletedAt().orElse(null),
        OnboardingProfileDto.fromDomain(summary.profile()),
        PlanningDefaultsDto.fromDomain(summary.preferences().planningDefaults()));
  }
}
