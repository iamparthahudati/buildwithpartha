package tech.buildwithpartha.lifeos.user.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.user.domain.UserPreferences;
import tech.buildwithpartha.lifeos.user.domain.UserPreferencesRepository;

class UserPreferencesExportContributorTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();

  private UserPreferencesRepository preferencesRepository;
  private UserPreferencesExportContributor contributor;

  @BeforeEach
  void setUp() {
    preferencesRepository = new FakeUserPreferencesRepository();
    UserPreferences pref = UserPreferences.createDefault(USER_ID, NOW);
    preferencesRepository.save(pref);
    contributor = new UserPreferencesExportContributor(preferencesRepository);
  }

  @Test
  void exportFileName_returnsPreferencesJson() {
    assertThat(contributor.exportFileName()).isEqualTo("preferences.json");
  }

  @Test
  void exportDataForUser_serializesPreferences() {
    byte[] jsonBytes = contributor.exportDataForUser(USER_ID);
    String json = new String(jsonBytes, StandardCharsets.UTF_8);

    assertThat(json)
        .contains("onboardingStatus")
        .contains("focusDurationMinutes")
        .contains("longBreakDurationMinutes")
        .contains("focusSessionsBeforeLongBreak")
        .contains("autoStartBreaks")
        .contains("autoStartFocusSessions")
        .contains("soundEnabled")
        .contains("browserNotificationsEnabled")
        .contains("workingDays");
  }
}
