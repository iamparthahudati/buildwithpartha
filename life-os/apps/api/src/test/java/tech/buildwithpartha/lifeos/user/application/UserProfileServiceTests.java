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
import tech.buildwithpartha.lifeos.user.domain.PlanningDefaults;
import tech.buildwithpartha.lifeos.user.domain.UserPreferences;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;

class UserProfileServiceTests {

  private final Instant now = Instant.parse("2026-08-19T10:00:00Z");
  private final Clock clock = Clock.fixed(now, ZoneOffset.UTC);
  private FakeUserProfileRepository profileRepository;
  private FakeUserPreferencesRepository preferencesRepository;
  private UserProfileService service;

  private UUID userId;

  @BeforeEach
  void setUp() {
    profileRepository = new FakeUserProfileRepository();
    preferencesRepository = new FakeUserPreferencesRepository();
    service = new UserProfileService(profileRepository, preferencesRepository, clock);

    userId = UUID.randomUUID();
    UserProfile initialProfile =
        new UserProfile(userId, "profile-user@example.test", "Partha", "UTC", "en-IN", 1, 0L);
    profileRepository.save(initialProfile);
  }

  @Test
  void getProfileReturnsExistingProfile() {
    UserProfile profile = service.getProfile(userId);
    assertThat(profile.displayName()).isEqualTo("Partha");
    assertThat(profile.timeZone()).isEqualTo("UTC");
  }

  @Test
  void updateProfileUpdatesAllFields() {
    UserProfile updated =
        service.updateProfile(
            userId, new UpdateProfileCommand("Partha H", "Asia/Kolkata", "en-IN", 1));

    assertThat(updated.displayName()).isEqualTo("Partha H");
    assertThat(updated.timeZone()).isEqualTo("Asia/Kolkata");
  }

  @Test
  void updateProfileRejectsInvalidTimezone() {
    assertThatThrownBy(
            () ->
                service.updateProfile(
                    userId, new UpdateProfileCommand("Partha", "Invalid/Timezone", "en-IN", 1)))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  void getPreferencesAutoInitializesDefaults() {
    UserPreferences prefs = service.getPreferences(userId);
    assertThat(prefs.planningDefaults().focusDurationMinutes()).isEqualTo(25);
  }

  @Test
  void updatePreferencesUpdatesPlanningDefaults() {
    PlanningDefaults newDefaults =
        new PlanningDefaults(
            List.of(1, 2, 3, 4, 5, 6),
            Optional.of(LocalTime.of(9, 0)),
            Optional.of(LocalTime.of(18, 0)),
            false,
            Optional.of(200),
            50,
            10);

    UserPreferences updated =
        service.updatePreferences(userId, new UpdatePreferencesCommand(newDefaults));

    assertThat(updated.planningDefaults().workingDays()).containsExactly(1, 2, 3, 4, 5, 6);
    assertThat(updated.planningDefaults().dailyFocusTargetMinutes()).contains(200);
    assertThat(updated.planningDefaults().focusDurationMinutes()).isEqualTo(50);
  }
}
