package tech.buildwithpartha.lifeos.user.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;
import tech.buildwithpartha.lifeos.user.domain.OnboardingStep;
import tech.buildwithpartha.lifeos.user.domain.PlanningDefaults;
import tech.buildwithpartha.lifeos.user.domain.UserPreferences;
import tech.buildwithpartha.lifeos.user.domain.UserPreferencesRepository;

/** Contributes user planning and focus preferences to data export archives (LOS-0517). */
@Component
public class UserPreferencesExportContributor implements UserDataExportContributor {

  private final UserPreferencesRepository repository;
  private final ObjectMapper objectMapper;

  public UserPreferencesExportContributor(UserPreferencesRepository repository) {
    this.repository = repository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "preferences.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    UserPreferences pref =
        repository
            .findByUserId(userId)
            .orElseGet(() -> UserPreferences.createDefault(userId, Instant.now()));

    Map<String, Object> data = new LinkedHashMap<>();
    data.put("onboardingStatus", pref.onboardingStatus().name());
    data.put("onboardingVersion", pref.onboardingVersion());
    data.put("lastCompletedStep", pref.lastCompletedStep().map(OnboardingStep::name).orElse(null));
    data.put(
        "onboardingCompletedAt", pref.onboardingCompletedAt().map(Instant::toString).orElse(null));

    PlanningDefaults defaults = pref.planningDefaults();
    data.put("workingDays", defaults.workingDays());
    data.put("workStartTime", defaults.workStartTime().map(Object::toString).orElse(null));
    data.put("workEndTime", defaults.workEndTime().map(Object::toString).orElse(null));
    data.put("overnightSchedule", defaults.overnightSchedule());
    data.put("dailyFocusTargetMinutes", defaults.dailyFocusTargetMinutes().orElse(null));
    data.put("focusDurationMinutes", defaults.focusDurationMinutes());
    data.put("breakDurationMinutes", defaults.breakDurationMinutes());
    data.put("longBreakDurationMinutes", defaults.longBreakDurationMinutes());
    data.put("focusSessionsBeforeLongBreak", defaults.focusSessionsBeforeLongBreak());
    data.put("autoStartBreaks", defaults.autoStartBreaks());
    data.put("autoStartFocusSessions", defaults.autoStartFocusSessions());
    data.put("soundEnabled", defaults.soundEnabled());
    data.put("browserNotificationsEnabled", defaults.browserNotificationsEnabled());

    try {
      return objectMapper.writeValueAsBytes(data);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize preferences export data", e);
    }
  }
}
