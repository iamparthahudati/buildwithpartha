package tech.buildwithpartha.lifeos.common.user;

import java.util.UUID;

/** Port for querying user timezone settings across domain boundaries (LOS-0607). */
@FunctionalInterface
public interface UserTimeZoneProvider {

  /**
   * Retrieves the configured IANA timezone identifier for the specified user, or a safe default
   * (e.g. UTC) if unspecified or unavailable.
   *
   * @param userId the user ID to query
   * @return the IANA timezone string (e.g. "Asia/Kolkata", "America/New_York", "UTC")
   */
  String getUserTimeZone(UUID userId);
}
