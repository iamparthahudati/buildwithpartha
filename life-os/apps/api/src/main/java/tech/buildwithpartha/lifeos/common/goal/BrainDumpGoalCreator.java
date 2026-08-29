package tech.buildwithpartha.lifeos.common.goal;

import java.util.UUID;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToGoalCommand;

public interface BrainDumpGoalCreator {
  UUID createGoal(UUID userId, ConvertToGoalCommand command);
}
