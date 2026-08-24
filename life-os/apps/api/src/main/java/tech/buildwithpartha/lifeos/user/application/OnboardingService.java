package tech.buildwithpartha.lifeos.user.application;

import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.user.domain.OnboardingStep;
import tech.buildwithpartha.lifeos.user.domain.PlanningDefaults;
import tech.buildwithpartha.lifeos.user.domain.TimezoneValidator;
import tech.buildwithpartha.lifeos.user.domain.UserPreferences;
import tech.buildwithpartha.lifeos.user.domain.UserPreferencesRepository;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;
import tech.buildwithpartha.lifeos.user.domain.UserProfileRepository;

/** Coordinates the multi-step onboarding lifecycle and preferences (LOS-0513). */
@Service
public class OnboardingService {

  private final UserProfileRepository userProfileRepository;
  private final UserPreferencesRepository userPreferencesRepository;
  private final Clock clock;

  public OnboardingService(
      UserProfileRepository userProfileRepository,
      UserPreferencesRepository userPreferencesRepository,
      Clock clock) {
    this.userProfileRepository = userProfileRepository;
    this.userPreferencesRepository = userPreferencesRepository;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public OnboardingSummary getOnboarding(UUID userId) {
    UserProfile profile = loadProfile(userId);
    UserPreferences preferences = loadOrCreatePreferences(userId);
    return new OnboardingSummary(profile, preferences);
  }

  @Transactional
  public OnboardingSummary updateWelcomeStep(UUID userId, UpdateWelcomeStepCommand command) {
    UserProfile profile = loadProfile(userId);
    UserPreferences preferences = loadOrCreatePreferences(userId);

    if (command.displayName() == null || command.displayName().isBlank()) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("displayName", "NotBlank")));
    }

    UserProfile updatedProfile =
        userProfileRepository.save(
            profile.withUpdates(
                command.displayName().trim(),
                profile.timeZone(),
                profile.locale(),
                profile.weekStart(),
                profile.version()));

    UserPreferences updatedPreferences =
        userPreferencesRepository.save(
            preferences.advanceStep(OnboardingStep.WELCOME, clock.instant()));

    return new OnboardingSummary(updatedProfile, updatedPreferences);
  }

  @Transactional
  public OnboardingSummary updateTimeAndWeekStep(
      UUID userId, UpdateTimeAndWeekStepCommand command) {
    UserProfile profile = loadProfile(userId);
    UserPreferences preferences = loadOrCreatePreferences(userId);

    if (!TimezoneValidator.isValidIanaTimeZone(command.timeZone())) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("timeZone", "INVALID_TIMEZONE")));
    }

    int weekStart = command.weekStart().orElse(profile.weekStart());
    if (weekStart < 1 || weekStart > 7) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("weekStart", "Range")));
    }

    String locale = command.locale().orElse(profile.locale());

    UserProfile updatedProfile =
        userProfileRepository.save(
            profile.withUpdates(
                profile.displayName(), command.timeZone(), locale, weekStart, profile.version()));

    UserPreferences updatedPreferences =
        userPreferencesRepository.save(
            preferences.advanceStep(OnboardingStep.TIME_AND_WEEK, clock.instant()));

    return new OnboardingSummary(updatedProfile, updatedPreferences);
  }

  @Transactional
  public OnboardingSummary updatePlanningDefaultsStep(
      UUID userId, UpdatePlanningDefaultsStepCommand command) {
    UserProfile profile = loadProfile(userId);
    UserPreferences preferences = loadOrCreatePreferences(userId);

    UserPreferences updatedPreferences;
    if (command.skipped()) {
      updatedPreferences =
          userPreferencesRepository.save(
              preferences.advanceStep(OnboardingStep.PLANNING_DEFAULTS, clock.instant()));
    } else {
      PlanningDefaults current = preferences.planningDefaults();
      List<Integer> workingDays = command.workingDays().orElse(current.workingDays());
      int focusDuration = command.focusDurationMinutes().orElse(current.focusDurationMinutes());
      int breakDuration = command.breakDurationMinutes().orElse(current.breakDurationMinutes());

      PlanningDefaults newDefaults =
          new PlanningDefaults(
              workingDays,
              command.workStartTime().isPresent()
                  ? command.workStartTime()
                  : current.workStartTime(),
              command.workEndTime().isPresent() ? command.workEndTime() : current.workEndTime(),
              command.overnightSchedule().orElse(current.overnightSchedule()),
              command.dailyFocusTargetMinutes().isPresent()
                  ? command.dailyFocusTargetMinutes()
                  : current.dailyFocusTargetMinutes(),
              focusDuration,
              breakDuration,
              current.longBreakDurationMinutes(),
              current.focusSessionsBeforeLongBreak(),
              current.autoStartBreaks(),
              current.autoStartFocusSessions(),
              current.soundEnabled(),
              current.browserNotificationsEnabled());

      updatedPreferences =
          userPreferencesRepository.save(
              preferences
                  .updatePlanningDefaults(newDefaults, clock.instant())
                  .advanceStep(OnboardingStep.PLANNING_DEFAULTS, clock.instant()));
    }

    return new OnboardingSummary(profile, updatedPreferences);
  }

  @Transactional
  public OnboardingSummary completeOnboarding(UUID userId, CompleteOnboardingCommand command) {
    UserProfile profile = loadProfile(userId);
    UserPreferences preferences = loadOrCreatePreferences(userId);

    UserPreferences completedPreferences =
        userPreferencesRepository.save(preferences.complete(clock.instant()));

    return new OnboardingSummary(profile, completedPreferences);
  }

  private UserProfile loadProfile(UUID userId) {
    return userProfileRepository
        .findByUserId(userId)
        .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
  }

  private UserPreferences loadOrCreatePreferences(UUID userId) {
    return userPreferencesRepository
        .findByUserId(userId)
        .orElseGet(
            () ->
                userPreferencesRepository.save(
                    UserPreferences.createDefault(userId, clock.instant())));
  }
}
