package tech.buildwithpartha.lifeos.user.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.user.domain.OnboardingStatus;
import tech.buildwithpartha.lifeos.user.domain.OnboardingStep;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;

class OnboardingServiceTests {

  private final Instant now = Instant.parse("2026-08-19T10:00:00Z");
  private final Clock clock = Clock.fixed(now, ZoneOffset.UTC);
  private FakeUserProfileRepository profileRepository;
  private FakeUserPreferencesRepository preferencesRepository;
  private OnboardingService service;

  private UUID userId;

  @BeforeEach
  void setUp() {
    profileRepository = new FakeUserProfileRepository();
    preferencesRepository = new FakeUserPreferencesRepository();
    service = new OnboardingService(profileRepository, preferencesRepository, clock);

    userId = UUID.randomUUID();
    UserProfile initialProfile =
        new UserProfile(
            userId, "onboarding-user@example.test", "Initial Name", "UTC", "en-IN", 1, 0L);
    profileRepository.save(initialProfile);
  }

  @Test
  void getOnboardingAutoInitializesPreferencesIfMissing() {
    OnboardingSummary summary = service.getOnboarding(userId);

    assertThat(summary.profile().displayName()).isEqualTo("Initial Name");
    assertThat(summary.preferences().onboardingStatus()).isEqualTo(OnboardingStatus.NOT_STARTED);
    assertThat(summary.preferences().lastCompletedStep()).isEmpty();
  }

  @Test
  void getOnboardingFailsForNonExistentUser() {
    UUID unknown = UUID.randomUUID();
    assertThatThrownBy(() -> service.getOnboarding(unknown))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void updateWelcomeStepUpdatesDisplayNameAndAdvancesStep() {
    OnboardingSummary summary =
        service.updateWelcomeStep(userId, new UpdateWelcomeStepCommand("Updated Partha"));

    assertThat(summary.profile().displayName()).isEqualTo("Updated Partha");
    assertThat(summary.preferences().onboardingStatus()).isEqualTo(OnboardingStatus.IN_PROGRESS);
    assertThat(summary.preferences().lastCompletedStep()).contains(OnboardingStep.WELCOME);
  }

  @Test
  void updateWelcomeStepRejectsBlankDisplayName() {
    assertThatThrownBy(() -> new UpdateWelcomeStepCommand("   "))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void updateTimeAndWeekStepValidatesTimezoneAndUpdatesSettings() {
    OnboardingSummary summary =
        service.updateTimeAndWeekStep(
            userId,
            new UpdateTimeAndWeekStepCommand("Asia/Kolkata", Optional.of("en-US"), Optional.of(7)));

    assertThat(summary.profile().timeZone()).isEqualTo("Asia/Kolkata");
    assertThat(summary.profile().locale()).isEqualTo("en-US");
    assertThat(summary.profile().weekStart()).isEqualTo(7);
    assertThat(summary.preferences().lastCompletedStep()).contains(OnboardingStep.TIME_AND_WEEK);
  }

  @Test
  void updateTimeAndWeekStepRejectsInvalidTimezone() {
    assertThatThrownBy(
            () ->
                service.updateTimeAndWeekStep(
                    userId,
                    new UpdateTimeAndWeekStepCommand(
                        "Not/Real_Zone", Optional.empty(), Optional.empty())))
        .isInstanceOf(FieldValidationException.class)
        .matches(
            ex ->
                ((FieldValidationException) ex).errors().get(0).code().equals("INVALID_TIMEZONE"));
  }

  @Test
  void updateTimeAndWeekStepRejectsInvalidWeekStart() {
    assertThatThrownBy(
            () ->
                service.updateTimeAndWeekStep(
                    userId,
                    new UpdateTimeAndWeekStepCommand("UTC", Optional.empty(), Optional.of(8))))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  void updatePlanningDefaultsStepSavesCustomHoursAndDurations() {
    OnboardingSummary summary =
        service.updatePlanningDefaultsStep(
            userId,
            new UpdatePlanningDefaultsStepCommand(
                Optional.of(List.of(1, 2, 3, 4)),
                Optional.of(LocalTime.of(8, 30)),
                Optional.of(LocalTime.of(17, 30)),
                Optional.of(false),
                Optional.of(180),
                Optional.of(45),
                Optional.of(10),
                false));

    assertThat(summary.preferences().planningDefaults().workingDays()).containsExactly(1, 2, 3, 4);
    assertThat(summary.preferences().planningDefaults().workStartTime())
        .contains(LocalTime.of(8, 30));
    assertThat(summary.preferences().planningDefaults().workEndTime())
        .contains(LocalTime.of(17, 30));
    assertThat(summary.preferences().planningDefaults().dailyFocusTargetMinutes()).contains(180);
    assertThat(summary.preferences().planningDefaults().focusDurationMinutes()).isEqualTo(45);
    assertThat(summary.preferences().planningDefaults().breakDurationMinutes()).isEqualTo(10);
    assertThat(summary.preferences().lastCompletedStep())
        .contains(OnboardingStep.PLANNING_DEFAULTS);
  }

  @Test
  void updatePlanningDefaultsStepCanBeSkippedWithoutModifyingDefaults() {
    OnboardingSummary summary =
        service.updatePlanningDefaultsStep(
            userId,
            new UpdatePlanningDefaultsStepCommand(
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                true));

    assertThat(summary.preferences().lastCompletedStep())
        .contains(OnboardingStep.PLANNING_DEFAULTS);
    assertThat(summary.preferences().planningDefaults().focusDurationMinutes()).isEqualTo(25);
  }

  @Test
  void completeOnboardingTransitionsToCompleted() {
    OnboardingSummary summary = service.completeOnboarding(userId, new CompleteOnboardingCommand());

    assertThat(summary.preferences().onboardingStatus()).isEqualTo(OnboardingStatus.COMPLETED);
    assertThat(summary.preferences().lastCompletedStep()).contains(OnboardingStep.START);
    assertThat(summary.preferences().onboardingCompletedAt()).contains(now);
  }
}
