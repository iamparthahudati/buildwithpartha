package tech.buildwithpartha.lifeos.user.domain;

import java.util.Objects;
import java.util.UUID;

/**
 * User-editable display and localization settings belonging to an account (LOS-0513,
 * 29-PRODUCT-VOCABULARY.md).
 */
public record UserProfile(
    UUID userId,
    String email,
    String displayName,
    String timeZone,
    String locale,
    int weekStart,
    long version) {

  public static final String DEFAULT_TIME_ZONE = "UTC";
  public static final String DEFAULT_LOCALE = "en-IN";
  public static final int DEFAULT_WEEK_START = 1;

  public UserProfile {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(email, "email must not be null");
    Objects.requireNonNull(displayName, "displayName must not be null");
    Objects.requireNonNull(timeZone, "timeZone must not be null");
    Objects.requireNonNull(locale, "locale must not be null");
    if (displayName.isBlank()) {
      throw new IllegalArgumentException("displayName must not be blank");
    }
    if (weekStart < 1 || weekStart > 7) {
      throw new IllegalArgumentException("weekStart must be between 1 and 7");
    }
  }

  public UserProfile withUpdates(
      String newDisplayName,
      String newTimeZone,
      String newLocale,
      int newWeekStart,
      long newVersion) {
    return new UserProfile(
        userId,
        email,
        newDisplayName != null ? newDisplayName : displayName,
        newTimeZone != null ? newTimeZone : timeZone,
        newLocale != null ? newLocale : locale,
        newWeekStart >= 1 && newWeekStart <= 7 ? newWeekStart : weekStart,
        newVersion);
  }
}
