package tech.buildwithpartha.lifeos.common.time;

import java.util.OptionalInt;
import java.util.UUID;

/** Domain-neutral read contract for an Account's optional daily focus target. */
public interface DailyFocusTargetProvider {

  OptionalInt getDailyFocusTargetMinutes(UUID userId);
}
