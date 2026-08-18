package tech.buildwithpartha.lifeos.auth.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The {@code public.users} row: LifeOS's authentication and lifecycle boundary (the product calls
 * this "Account"; {@code 29-PRODUCT-VOCABULARY.md} keeps the backend identity type named {@code
 * User}).
 *
 * <p>Timezone, locale and week start are collected during onboarding ({@code
 * 25-ONBOARDING-SPECIFICATION.md}), not at signup, so {@link #signup} seeds them with the
 * documented safe defaults: {@link #DEFAULT_TIME_ZONE} ("Use UTC for now" is an explicit valid
 * onboarding choice) and {@link #DEFAULT_LOCALE} (ADR-012's India-first posture). Onboarding
 * (LOS-0513) overwrites both once the user confirms them.
 */
public record User(
    UUID id,
    EmailAddress email,
    String displayName,
    String timeZone,
    String locale,
    int weekStart,
    AccountStatus accountStatus,
    Optional<Instant> verifiedAt,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static final String DEFAULT_TIME_ZONE = "UTC";
  public static final String DEFAULT_LOCALE = "en-IN";
  public static final int DEFAULT_WEEK_START = 1;

  public User {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(email, "email must not be null");
    Objects.requireNonNull(displayName, "displayName must not be null");
    Objects.requireNonNull(timeZone, "timeZone must not be null");
    Objects.requireNonNull(locale, "locale must not be null");
    Objects.requireNonNull(accountStatus, "accountStatus must not be null");
    Objects.requireNonNull(verifiedAt, "verifiedAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    if (displayName.isBlank()) {
      throw new IllegalArgumentException("displayName must not be blank");
    }
    if (weekStart < 1 || weekStart > 7) {
      throw new IllegalArgumentException("weekStart must be between 1 and 7");
    }
  }

  /** Creates a new unverified account (LOS-0503 signup). */
  public static User signup(UUID id, EmailAddress email, String displayName, Instant now) {
    return new User(
        id,
        email,
        displayName,
        DEFAULT_TIME_ZONE,
        DEFAULT_LOCALE,
        DEFAULT_WEEK_START,
        AccountStatus.UNVERIFIED,
        Optional.empty(),
        now,
        now,
        0L);
  }
}
