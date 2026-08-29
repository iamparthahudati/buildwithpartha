package tech.buildwithpartha.lifeos.user.application;

import java.util.OptionalInt;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.time.DailyFocusTargetProvider;
import tech.buildwithpartha.lifeos.user.domain.UserPreferencesRepository;

/** Supplies the optional Account focus target without exposing the user domain to reports. */
@Component
public class DailyFocusTargetAdapter implements DailyFocusTargetProvider {

  private final UserPreferencesRepository repository;

  public DailyFocusTargetAdapter(UserPreferencesRepository repository) {
    this.repository = repository;
  }

  @Override
  @Transactional(readOnly = true)
  public OptionalInt getDailyFocusTargetMinutes(UUID userId) {
    return repository
        .findByUserId(userId)
        .flatMap(preferences -> preferences.planningDefaults().dailyFocusTargetMinutes())
        .map(OptionalInt::of)
        .orElseGet(OptionalInt::empty);
  }
}
