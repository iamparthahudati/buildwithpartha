package tech.buildwithpartha.lifeos.common.task;

import java.util.UUID;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToTaskCommand;

public interface BrainDumpTaskCreator {
  UUID createTask(UUID userId, ConvertToTaskCommand command);
}
