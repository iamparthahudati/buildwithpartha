package tech.buildwithpartha.lifeos.user.api;

import tech.buildwithpartha.lifeos.user.domain.UserPreferences;

public record UserPreferencesResponse(PlanningDefaultsDto planningDefaults) {

  public static UserPreferencesResponse fromDomain(UserPreferences preferences) {
    return new UserPreferencesResponse(
        PlanningDefaultsDto.fromDomain(preferences.planningDefaults()));
  }
}
