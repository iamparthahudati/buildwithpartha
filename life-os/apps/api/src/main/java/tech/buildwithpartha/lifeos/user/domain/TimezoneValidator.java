package tech.buildwithpartha.lifeos.user.domain;

import java.time.ZoneId;
import java.util.Set;

/**
 * Validates server-supported IANA timezone identifiers (LOS-0513, 25-ONBOARDING-SPECIFICATION.md).
 */
public final class TimezoneValidator {

  private static final Set<String> AVAILABLE_ZONE_IDS = Set.copyOf(ZoneId.getAvailableZoneIds());

  private TimezoneValidator() {}

  /** Returns {@code true} if {@code timeZone} is a recognized IANA timezone identifier or UTC. */
  public static boolean isValidIanaTimeZone(String timeZone) {
    if (timeZone == null || timeZone.isBlank()) {
      return false;
    }
    if ("UTC".equals(timeZone)) {
      return true;
    }
    if (!AVAILABLE_ZONE_IDS.contains(timeZone)) {
      return false;
    }
    try {
      ZoneId.of(timeZone);
      return true;
    } catch (Exception e) {
      return false;
    }
  }
}
