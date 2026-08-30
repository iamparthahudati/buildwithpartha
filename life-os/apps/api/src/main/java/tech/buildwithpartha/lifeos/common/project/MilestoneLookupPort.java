package tech.buildwithpartha.lifeos.common.project;

import java.util.Optional;
import java.util.UUID;

/**
 * Outbound port letting other modules resolve a milestone owned by a user. Implemented by the
 * project module. Returns empty when the milestone does not exist or is not owned by the user.
 */
public interface MilestoneLookupPort {

  Optional<MilestoneReference> findOwnedMilestone(UUID userId, UUID milestoneId);
}
