package tech.buildwithpartha.lifeos.user.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.user.domain.PlanningDefaults;
import tech.buildwithpartha.lifeos.user.domain.UserPreferences;
import tech.buildwithpartha.lifeos.user.domain.UserPreferencesRepository;

@Repository
public class JpaUserPreferencesRepository implements UserPreferencesRepository {

  private final UserPreferencesJpaRepository jpaRepository;

  public JpaUserPreferencesRepository(UserPreferencesJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public Optional<UserPreferences> findByUserId(UUID userId) {
    return jpaRepository.findByUserId(userId).map(JpaUserPreferencesRepository::toDomain);
  }

  @Override
  public UserPreferences save(UserPreferences preferences) {
    UserPreferencesEntity entity = toEntity(preferences);
    UserPreferencesEntity saved = jpaRepository.save(entity);
    return toDomain(saved);
  }

  @Override
  public void deleteByUserId(UUID userId) {
    jpaRepository.deleteByUserId(userId);
  }

  static UserPreferences toDomain(UserPreferencesEntity entity) {
    PlanningDefaults planningDefaults =
        new PlanningDefaults(
            entity.getWorkingDaysList(),
            Optional.ofNullable(entity.getWorkStartTime()),
            Optional.ofNullable(entity.getWorkEndTime()),
            entity.isOvernightSchedule(),
            Optional.ofNullable(entity.getDailyFocusTargetMinutes()),
            entity.getFocusDurationMinutes(),
            entity.getBreakDurationMinutes(),
            entity.getLongBreakDurationMinutes(),
            entity.getFocusSessionsBeforeLongBreak(),
            entity.isAutoStartBreaks(),
            entity.isAutoStartFocusSessions(),
            entity.isSoundEnabled(),
            entity.isBrowserNotificationsEnabled());

    return new UserPreferences(
        entity.getId(),
        entity.getUserId(),
        entity.getOnboardingVersion(),
        entity.getOnboardingStatus(),
        Optional.ofNullable(entity.getLastCompletedStep()),
        Optional.ofNullable(entity.getOnboardingCompletedAt()),
        planningDefaults,
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        entity.getVersion());
  }

  static UserPreferencesEntity toEntity(UserPreferences domain) {
    PlanningDefaults defaults = domain.planningDefaults();
    Integer[] workingDaysArray = defaults.workingDays().toArray(Integer[]::new);

    return new UserPreferencesEntity(
        domain.id(),
        domain.userId(),
        domain.onboardingVersion(),
        domain.onboardingStatus(),
        domain.lastCompletedStep().orElse(null),
        domain.onboardingCompletedAt().orElse(null),
        workingDaysArray,
        defaults.workStartTime().orElse(null),
        defaults.workEndTime().orElse(null),
        defaults.overnightSchedule(),
        defaults.dailyFocusTargetMinutes().orElse(null),
        defaults.focusDurationMinutes(),
        defaults.breakDurationMinutes(),
        defaults.longBreakDurationMinutes(),
        defaults.focusSessionsBeforeLongBreak(),
        defaults.autoStartBreaks(),
        defaults.autoStartFocusSessions(),
        defaults.soundEnabled(),
        defaults.browserNotificationsEnabled(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }
}
