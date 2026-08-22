package tech.buildwithpartha.lifeos.user.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class UserPreferencesTests {

  @Test
  void createDefaultInitializesNotStartedState() {
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-19T10:00:00Z");

    UserPreferences preferences = UserPreferences.createDefault(userId, now);

    assertThat(preferences.userId()).isEqualTo(userId);
    assertThat(preferences.onboardingVersion()).isEqualTo(1);
    assertThat(preferences.onboardingStatus()).isEqualTo(OnboardingStatus.NOT_STARTED);
    assertThat(preferences.lastCompletedStep()).isEmpty();
    assertThat(preferences.onboardingCompletedAt()).isEmpty();
    assertThat(preferences.planningDefaults().focusDurationMinutes()).isEqualTo(25);
  }

  @Test
  void advanceStepTransitionsToInProgress() {
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-19T10:00:00Z");
    UserPreferences preferences = UserPreferences.createDefault(userId, now);

    UserPreferences step1 = preferences.advanceStep(OnboardingStep.WELCOME, now.plusSeconds(60));

    assertThat(step1.onboardingStatus()).isEqualTo(OnboardingStatus.IN_PROGRESS);
    assertThat(step1.lastCompletedStep()).contains(OnboardingStep.WELCOME);
    assertThat(step1.updatedAt()).isEqualTo(now.plusSeconds(60));
  }

  @Test
  void completeTransitionsToCompletedWithTimestamp() {
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-19T10:00:00Z");
    UserPreferences preferences = UserPreferences.createDefault(userId, now);

    UserPreferences completed = preferences.complete(now.plusSeconds(120));

    assertThat(completed.onboardingStatus()).isEqualTo(OnboardingStatus.COMPLETED);
    assertThat(completed.lastCompletedStep()).contains(OnboardingStep.START);
    assertThat(completed.onboardingCompletedAt()).contains(now.plusSeconds(120));
  }
}
