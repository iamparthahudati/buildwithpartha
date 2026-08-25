package tech.buildwithpartha.lifeos.common.user;

import java.util.UUID;

/** Cross-domain port for the Account settings that define a local planning week. */
@FunctionalInterface
public interface UserPlanningContextProvider {
  UserPlanningContext getPlanningContext(UUID userId);
}
