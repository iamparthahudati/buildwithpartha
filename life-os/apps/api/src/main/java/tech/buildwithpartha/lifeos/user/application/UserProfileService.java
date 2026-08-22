package tech.buildwithpartha.lifeos.user.application;

import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.user.domain.TimezoneValidator;
import tech.buildwithpartha.lifeos.user.domain.UserPreferences;
import tech.buildwithpartha.lifeos.user.domain.UserPreferencesRepository;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;
import tech.buildwithpartha.lifeos.user.domain.UserProfileRepository;

/** Service for profile and preferences management (LOS-0513, LOS-0515). */
@Service
public class UserProfileService {

  private final UserProfileRepository userProfileRepository;
  private final UserPreferencesRepository userPreferencesRepository;
  private final Clock clock;

  public UserProfileService(
      UserProfileRepository userProfileRepository,
      UserPreferencesRepository userPreferencesRepository,
      Clock clock) {
    this.userProfileRepository = userProfileRepository;
    this.userPreferencesRepository = userPreferencesRepository;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public UserProfile getProfile(UUID userId) {
    return userProfileRepository
        .findByUserId(userId)
        .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
  }

  @Transactional
  public UserProfile updateProfile(UUID userId, UpdateProfileCommand command) {
    UserProfile profile = getProfile(userId);

    if (command.displayName() == null || command.displayName().isBlank()) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("displayName", "NotBlank")));
    }
    if (!TimezoneValidator.isValidIanaTimeZone(command.timeZone())) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("timeZone", "INVALID_TIMEZONE")));
    }
    if (command.weekStart() < 1 || command.weekStart() > 7) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("weekStart", "Range")));
    }

    return userProfileRepository.save(
        profile.withUpdates(
            command.displayName().trim(),
            command.timeZone(),
            command.locale().trim(),
            command.weekStart(),
            profile.version()));
  }

  @Transactional(readOnly = true)
  public UserPreferences getPreferences(UUID userId) {
    return userPreferencesRepository
        .findByUserId(userId)
        .orElseGet(
            () ->
                userPreferencesRepository.save(
                    UserPreferences.createDefault(userId, clock.instant())));
  }

  @Transactional
  public UserPreferences updatePreferences(UUID userId, UpdatePreferencesCommand command) {
    UserPreferences current = getPreferences(userId);
    return userPreferencesRepository.save(
        current.updatePlanningDefaults(command.planningDefaults(), clock.instant()));
  }
}
